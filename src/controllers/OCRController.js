const queueService = require('../services/QueueService');
const processingPipelineService = require('../services/ProcessingPipelineService');
const enhancedOCRService = require('../services/EnhancedOCRService');
const { Document } = require('../models');

class OCRController {
  /**
   * Start OCR processing for a document
   */
  async processDocument(req, res) {
    try {
      const { documentId } = req.params;
      const { 
        pipelineId = 'default',
        language = 'eng',
        priority = 10,
        documentType = 'general',
        options = {}
      } = req.body;

      // Find the document
      const document = await Document.findOne({
        where: { id: documentId, uploadedBy: req.user.id }
      });

      if (!document) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Document not found'
        });
      }

      // Check if document supports OCR
      if (!enhancedOCRService.isSupportedFormat(document.mimeType)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: `OCR not supported for file type: ${document.mimeType}`
        });
      }

      // Initialize services if needed
      if (!queueService.isInitialized) {
        await queueService.initialize();
      }

      // Add OCR processing job to queue
      const job = await queueService.addOCRJob(
        document.id,
        document.storageKey,
        {
          language,
          documentType,
          priority,
          userId: req.user.id,
          ...options
        }
      );

      res.status(202).json({
        message: 'OCR processing started',
        document: {
          id: document.id,
          filename: document.originalName,
          mimeType: document.mimeType
        },
        processing: {
          jobId: job.id,
          pipelineId,
          language,
          status: 'queued',
          estimatedTime: '2-5 minutes'
        }
      });
    } catch (error) {
      console.error('Document OCR processing error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to start OCR processing'
      });
    }
  }

  /**
   * Execute full processing pipeline for a document
   */
  async processPipeline(req, res) {
    try {
      const { documentId } = req.params;
      const { 
        pipelineId = 'default',
        async: isAsync = true,
        options = {}
      } = req.body;

      // Find the document
      const document = await Document.findOne({
        where: { id: documentId, uploadedBy: req.user.id }
      });

      if (!document) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Document not found'
        });
      }

      // Check if document supports processing
      if (!enhancedOCRService.isSupportedFormat(document.mimeType)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: `Document processing not supported for file type: ${document.mimeType}`
        });
      }

      // Initialize pipeline service
      if (!processingPipelineService.isInitialized) {
        await processingPipelineService.initialize();
      }

      if (isAsync) {
        // Execute pipeline asynchronously
        processingPipelineService.executeProcessingPipeline(
          document.id,
          document.storageKey,
          pipelineId,
          { ...options, userId: req.user.id }
        ).catch(error => {
          console.error(`Pipeline execution failed for document ${document.id}:`, error);
        });

        res.status(202).json({
          message: 'Processing pipeline started',
          document: {
            id: document.id,
            filename: document.originalName,
            mimeType: document.mimeType
          },
          pipeline: {
            id: pipelineId,
            status: 'running',
            async: true
          }
        });
      } else {
        // Execute pipeline synchronously
        const result = await processingPipelineService.executeProcessingPipeline(
          document.id,
          document.storageKey,
          pipelineId,
          { ...options, userId: req.user.id }
        );

        res.status(200).json({
          message: 'Processing pipeline completed',
          document: {
            id: document.id,
            filename: document.originalName,
            mimeType: document.mimeType
          },
          pipeline: result
        });
      }
    } catch (error) {
      console.error('Pipeline processing error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to execute processing pipeline'
      });
    }
  }

  /**
   * Get OCR job status
   */
  async getJobStatus(req, res) {
    try {
      const { jobId } = req.params;
      const { queueType = 'ocr' } = req.query;

      const jobStatus = await queueService.getJobStatus(jobId, queueType);

      if (jobStatus.status === 'not_found') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Job not found'
        });
      }

      res.json({
        job: jobStatus
      });
    } catch (error) {
      console.error('Get job status error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get job status'
      });
    }
  }

  /**
   * Get available processing pipelines
   */
  async getPipelines(req, res) {
    try {
      if (!processingPipelineService.isInitialized) {
        await processingPipelineService.initialize();
      }

      const pipelines = processingPipelineService.getAvailablePipelines();
      const stats = await processingPipelineService.getPipelineStats();

      res.json({
        pipelines,
        statistics: stats,
        supportedLanguages: enhancedOCRService.getSupportedLanguages(),
        supportedFormats: [
          'image/jpeg',
          'image/png', 
          'image/bmp',
          'image/tiff',
          'application/pdf'
        ]
      });
    } catch (error) {
      console.error('Get pipelines error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get processing pipelines'
      });
    }
  }

  /**
   * Get pipeline configuration
   */
  async getPipelineConfig(req, res) {
    try {
      const { pipelineId } = req.params;

      if (!processingPipelineService.isInitialized) {
        await processingPipelineService.initialize();
      }

      const config = processingPipelineService.getPipelineConfig(pipelineId);

      if (!config) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Pipeline not found'
        });
      }

      res.json({
        pipeline: config
      });
    } catch (error) {
      console.error('Get pipeline config error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get pipeline configuration'
      });
    }
  }

  /**
   * Get OCR and queue statistics (Admin only)
   */
  async getStatistics(req, res) {
    try {
      const ocrStats = await queueService.getQueueStats('ocr');
      const metadataStats = await queueService.getQueueStats('metadata');
      const healthStatus = await queueService.getHealthStatus();
      const pipelineStats = await processingPipelineService.getPipelineStats();

      res.json({
        queues: {
          ocr: ocrStats,
          metadata: metadataStats
        },
        health: healthStatus,
        pipelines: pipelineStats,
        supportedLanguages: enhancedOCRService.getSupportedLanguages(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get OCR statistics error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get OCR statistics'
      });
    }
  }

  /**
   * Retry failed OCR job
   */
  async retryJob(req, res) {
    try {
      const { jobId } = req.params;
      const { queueType = 'ocr' } = req.body;

      const jobStatus = await queueService.getJobStatus(jobId, queueType);

      if (jobStatus.status === 'not_found') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Job not found'
        });
      }

      if (jobStatus.status !== 'failed') {
        return res.status(400).json({
          error: 'Validation Error',
          message: `Job cannot be retried. Current status: ${jobStatus.status}`
        });
      }

      // Create new job with same data
      const newJob = queueType === 'ocr' 
        ? await queueService.addOCRJob(
            jobStatus.data.documentVersionId,
            jobStatus.data.storageKey,
            jobStatus.data.options
          )
        : await queueService.addMetadataJob(
            jobStatus.data.documentVersionId,
            jobStatus.data.text,
            jobStatus.data.documentType,
            jobStatus.data.options
          );

      res.json({
        message: 'Job retry initiated',
        originalJobId: jobId,
        newJobId: newJob.id,
        status: 'queued'
      });
    } catch (error) {
      console.error('Retry job error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retry job'
      });
    }
  }

  /**
   * Cancel OCR job
   */
  async cancelJob(req, res) {
    try {
      const { jobId } = req.params;
      const { queueType = 'ocr' } = req.body;

      const queue = queueType === 'ocr' ? queueService.ocrQueue : queueService.metadataQueue;
      const job = await queue.getJob(jobId);

      if (!job) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Job not found'
        });
      }

      const state = await job.getState();
      
      if (state === 'completed') {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Cannot cancel completed job'
        });
      }

      if (state === 'active') {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Cannot cancel job that is currently processing'
        });
      }

      await job.remove();

      res.json({
        message: 'Job cancelled successfully',
        jobId,
        previousStatus: state
      });
    } catch (error) {
      console.error('Cancel job error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to cancel job'
      });
    }
  }

  /**
   * Clean old jobs from queues (Admin only)
   */
  async cleanJobs(req, res) {
    try {
      const { gracePeriod = 24 } = req.body; // hours
      const graceMs = gracePeriod * 60 * 60 * 1000;

      const cleanResult = await queueService.cleanQueues(graceMs);

      res.json({
        message: 'Queue cleanup completed',
        cleaned: cleanResult,
        gracePeriod: `${gracePeriod} hours`
      });
    } catch (error) {
      console.error('Clean jobs error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to clean jobs'
      });
    }
  }

    /**
     * List all jobs in OCR and metadata queues
     */
    async listJobs(req, res) {
      try {
        const { queueType = 'ocr', status = 'all', limit = 20 } = req.query;
        if (!queueService.isInitialized) {
          await queueService.initialize();
        }
        const queue = queueType === 'ocr' ? queueService.ocrQueue : queueService.metadataQueue;
        let jobs = [];
        switch (status) {
          case 'waiting':
            jobs = await queue.getWaiting();
            break;
          case 'active':
            jobs = await queue.getActive();
            break;
          case 'completed':
            jobs = await queue.getCompleted();
            break;
          case 'failed':
            jobs = await queue.getFailed();
            break;
          case 'delayed':
            jobs = await queue.getDelayed();
            break;
          case 'all':
          default: {
            const waiting = await queue.getWaiting();
            const active = await queue.getActive();
            const completed = await queue.getCompleted();
            const failed = await queue.getFailed();
            const delayed = await queue.getDelayed();
            jobs = [...waiting, ...active, ...completed, ...failed, ...delayed];
            break;
          }
        }
        // Limit jobs returned
        jobs = jobs.slice(0, limit);
        // Map job details
        const jobDetails = await Promise.all(jobs.map(async job => {
          const state = await job.getState();
          return {
            id: job.id,
            status: state,
            progress: job.progress(),
            data: job.data,
            result: job.returnvalue,
            failedReason: job.failedReason,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn,
            attempts: job.attemptsMade,
            maxAttempts: job.opts.attempts
          };
        }));
        res.json({
          jobs: jobDetails,
          queueType,
          status,
          count: jobDetails.length
        });
      } catch (error) {
        console.error('List jobs error:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to list jobs'
        });
      }
    }
}

module.exports = new OCRController();