// const Bull = require('bull');
// const Redis = require('ioredis');
// const ocrService = require('./OCRService');
// const storageService = require('./StorageService');

const Bull = require('bull');
const Redis = require('ioredis');
const ocrService = require('./OCRService');
const storageService = require('./StorageService');

class QueueService {
  constructor() {
    this.redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || null,
      db: process.env.REDIS_DB || 0,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true
    };
    this.redis = null;
    this.ocrQueue = null;
    this.metadataQueue = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.warn('Initializing Queue Service...');
      this.redis = new Redis(this.redisConfig);
      await this.redis.ping();
      console.warn('Redis connection established');
      this.ocrQueue = new Bull('ocr processing', {
        redis: this.redisConfig,
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 }
        }
      });
      this.metadataQueue = new Bull('metadata extraction', {
        redis: this.redisConfig,
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 }
        }
      });
      this.setupQueueProcessors();
      this.setupQueueEvents();
      this.isInitialized = true;
      console.warn('Queue Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Queue Service:', error.message);
      throw error;
    }
  }

  setupQueueProcessors() {
    this.ocrQueue.process('process-ocr', async (job) => {
      const { documentVersionId, storageKey, options = {} } = job.data;
      try {
        console.warn(`Processing OCR for document version: ${documentVersionId}`);
        if (!storageService.isConnected) {
          await storageService.connect();
        }
        const fileStream = await storageService.downloadFile(storageKey);
        const chunks = [];
        for await (const chunk of fileStream) {
          chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);
        const ocrResult = await ocrService.extractTextFromImage(fileBuffer, options);
        job.progress(80);
        const metadata = ocrService.extractMetadataFromText(
          ocrResult.text,
          options.documentType || 'general'
        );
        job.progress(100);
        console.warn(`OCR completed for document version: ${documentVersionId}`);
        return {
          documentVersionId,
          ocr: ocrResult,
          metadata,
          completedAt: new Date().toISOString()
        };
      } catch (error) {
        console.error(`OCR processing failed for ${documentVersionId}:`, error);
        throw error;
      }
    });

    this.metadataQueue.process('extract-metadata', async (job) => {
      const { documentVersionId, text, documentType = 'general' } = job.data;
      try {
        console.warn(`Extracting metadata for document version: ${documentVersionId}`);
        const metadata = ocrService.extractMetadataFromText(text, documentType);
        console.warn(`Metadata extraction completed for document version: ${documentVersionId}`);
        return {
          documentVersionId,
          metadata,
          extractedAt: new Date().toISOString()
        };
      } catch (error) {
        console.error(`Metadata extraction failed for ${documentVersionId}:`, error);
        throw error;
      }
    });
  }

  setupQueueEvents() {
    this.ocrQueue.on('completed', (job, result) => {
      console.warn(`OCR job ${job.id} completed for document ${result.documentVersionId}`);
    });
    this.ocrQueue.on('failed', (job, error) => {
      console.error(`OCR job ${job.id} failed:`, error.message);
    });
    this.ocrQueue.on('progress', (job, progress) => {
      console.warn(`OCR job ${job.id} progress: ${progress}%`);
    });
    this.metadataQueue.on('completed', (job, result) => {
      console.warn(`Metadata job ${job.id} completed for document ${result.documentVersionId}`);
    });
    this.metadataQueue.on('failed', (job, error) => {
      console.error(`Metadata job ${job.id} failed:`, error.message);
    });
  }

  async addOCRJob(documentVersionId, storageKey, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    const jobOptions = {
      priority: options.priority || 10,
      delay: options.delay || 0,
      attempts: options.attempts || 3
    };
    const job = await this.ocrQueue.add('process-ocr', {
      documentVersionId,
      storageKey,
      options
    }, jobOptions);
    console.warn(`OCR job ${job.id} added to queue for document version: ${documentVersionId}`);
    return job;
  }

  async addMetadataJob(documentVersionId, text, documentType = 'general', options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    const jobOptions = {
      priority: options.priority || 5,
      delay: options.delay || 0,
      attempts: options.attempts || 3
    };
    const job = await this.metadataQueue.add('extract-metadata', {
      documentVersionId,
      text,
      documentType
    }, jobOptions);
    console.warn(`Metadata job ${job.id} added to queue for document version: ${documentVersionId}`);
    return job;
  }

  async getJobStatus(jobId, queueType = 'ocr') {
    const queue = queueType === 'ocr' ? this.ocrQueue : this.metadataQueue;
    try {
      const job = await queue.getJob(jobId);
      if (!job) {
        return { status: 'not_found' };
      }
      const state = await job.getState();
      const progress = job.progress();
      return {
        id: job.id,
        status: state,
        progress,
        data: job.data,
        result: job.returnvalue,
        failedReason: job.failedReason,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts
      };
    } catch (error) {
      console.error(`Error getting job status for ${jobId}:`, error);
      return { status: 'error', error: error.message };
    }
  }

  async getQueueStats(queueType = 'ocr') {
    const queue = queueType === 'ocr' ? this.ocrQueue : this.metadataQueue;
    try {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();
      const delayed = await queue.getDelayed();
      return {
        queueType,
        counts: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
          total: waiting.length + active.length + completed.length + failed.length + delayed.length
        },
        jobs: {
          waiting: waiting.slice(0, 5).map(job => ({ id: job.id, data: job.data })),
          active: active.slice(0, 5).map(job => ({ id: job.id, data: job.data, progress: job.progress() })),
          failed: failed.slice(0, 5).map(job => ({ id: job.id, data: job.data, reason: job.failedReason }))
        }
      };
    } catch (error) {
      console.error(`Error getting queue stats for ${queueType}:`, error);
      return { error: error.message };
    }
  }

  async cleanQueues(grace = 24 * 60 * 60 * 1000) {
    try {
      const ocrCleaned = await this.ocrQueue.clean(grace, 'completed');
      const ocrFailedCleaned = await this.ocrQueue.clean(grace, 'failed');
      const metadataCleaned = await this.metadataQueue.clean(grace, 'completed');
      const metadataFailedCleaned = await this.metadataQueue.clean(grace, 'failed');
      console.warn(`Queue cleanup completed: OCR: ${ocrCleaned.length} completed, ${ocrFailedCleaned.length} failed. Metadata: ${metadataCleaned.length} completed, ${metadataFailedCleaned.length} failed.`);
      return {
        ocr: { completed: ocrCleaned.length, failed: ocrFailedCleaned.length },
        metadata: { completed: metadataCleaned.length, failed: metadataFailedCleaned.length }
      };
    } catch (error) {
      console.error('Error cleaning queues:', error);
      throw error;
    }
  }

  async pauseQueue(queueType = 'ocr') {
    const queue = queueType === 'ocr' ? this.ocrQueue : this.metadataQueue;
    await queue.pause();
    console.warn(`${queueType} queue paused`);
  }

  async resumeQueue(queueType = 'ocr') {
    const queue = queueType === 'ocr' ? this.ocrQueue : this.metadataQueue;
    await queue.resume();
    console.warn(`${queueType} queue resumed`);
  }

  async getHealthStatus() {
    try {
      const isRedisConnected = this.redis && this.redis.status === 'ready';
      const ocrStats = await this.getQueueStats('ocr');
      const metadataStats = await this.getQueueStats('metadata');
      return {
        status: isRedisConnected ? 'healthy' : 'unhealthy',
        redis: {
          connected: isRedisConnected,
          status: this.redis ? this.redis.status : 'disconnected'
        },
        queues: {
          ocr: ocrStats,
          metadata: metadataStats
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async close() {
    try {
      console.warn('Shutting down Queue Service...');
      if (this.ocrQueue) {
        await this.ocrQueue.close();
      }
      if (this.metadataQueue) {
        await this.metadataQueue.close();
      }
      if (this.redis) {
        await this.redis.disconnect();
      }
      console.warn('Queue Service shut down successfully');
    } catch (error) {
      console.error('Error shutting down Queue Service:', error);
      throw error;
    }
  }
}

module.exports = new QueueService();