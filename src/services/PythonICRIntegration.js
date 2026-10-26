/**
 * Python ICR Integration Service
 * 
 * Provides integration between the Node.js backend and Python ICR microservice.
 * Handles handwriting recognition, signature verification, and form processing.
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const { logger } = require('../utils');

class PythonICRIntegration {
  constructor() {
    this.baseURL = process.env.PYTHON_ICR_URL || 'http://localhost:8001';
    this.timeout = 30000; // 30 seconds
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    
    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    logger.info(`Python ICR Integration initialized with base URL: ${this.baseURL}`);
  }

  /**
   * Check if ICR service is healthy
   */
  async checkHealth() {
    try {
      const response = await this.client.get('/health');
      return {
        status: 'healthy',
        services: response.data.services,
        timestamp: response.data.timestamp
      };
    } catch (error) {
      logger.error('ICR service health check failed:', error.message);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get ICR service information
   */
  async getServiceInfo() {
    try {
      const response = await this.client.get('/');
      return response.data;
    } catch (error) {
      logger.error('Failed to get ICR service info:', error.message);
      throw new Error(`ICR service unavailable: ${error.message}`);
    }
  }

  /**
   * Recognize handwriting from image file
   */
  async recognizeHandwriting(
    imagePath, 
    options = {}
  ) {
    const {
      recognitionType = 'full_text', // full_text, line_by_line, word_by_word
      preprocess = true
    } = options;

    try {
      // Create form data with image
      const formData = new FormData();
      const imageBuffer = await fs.readFile(imagePath);
      formData.append('file', imageBuffer, {
        filename: 'handwriting.png',
        contentType: 'image/png'
      });

      // Make request with retry logic
      const response = await this._makeRequestWithRetry(
        'POST',
        '/recognize',
        formData,
        {
          params: {
            recognition_type: recognitionType,
            preprocess: preprocess
          },
          headers: formData.getHeaders(),
          timeout: 60000 // 1 minute for recognition
        }
      );

      logger.info(`Handwriting recognition completed for ${imagePath}`);
      return {
        success: true,
        result: response.data,
        processingTime: response.headers['x-processing-time'] || null
      };

    } catch (error) {
      logger.error(`Handwriting recognition failed for ${imagePath}:`, error.message);
      throw new Error(`ICR recognition failed: ${error.message}`);
    }
  }

  /**
   * Preprocess handwriting image without recognition
   */
  async preprocessHandwriting(
    imagePath,
    options = {}
  ) {
    const {
      taskType = 'line_recognition', // line_recognition, word_recognition, character_recognition
      returnSegments = false
    } = options;

    try {
      // Create form data with image
      const formData = new FormData();
      const imageBuffer = await fs.readFile(imagePath);
      formData.append('file', imageBuffer, {
        filename: 'handwriting.png',
        contentType: 'image/png'
      });

      const response = await this._makeRequestWithRetry(
        'POST',
        '/preprocess',
        formData,
        {
          params: {
            task_type: taskType,
            return_segments: returnSegments
          },
          headers: formData.getHeaders()
        }
      );

      logger.info(`Handwriting preprocessing completed for ${imagePath}`);
      return {
        success: true,
        result: response.data
      };

    } catch (error) {
      logger.error(`Handwriting preprocessing failed for ${imagePath}:`, error.message);
      throw new Error(`ICR preprocessing failed: ${error.message}`);
    }
  }

  /**
   * Add training sample to ICR model
   */
  async addTrainingSample(
    imagePath,
    groundTruth,
    options = {}
  ) {
    const {
      category = 'general',
      metadata = {}
    } = options;

    try {
      // Create form data
      const formData = new FormData();
      const imageBuffer = await fs.readFile(imagePath);
      formData.append('file', imageBuffer, {
        filename: 'training_sample.png',
        contentType: 'image/png'
      });
      formData.append('ground_truth', groundTruth);
      formData.append('category', category);
      
      if (Object.keys(metadata).length > 0) {
        formData.append('metadata', JSON.stringify(metadata));
      }

      const response = await this._makeRequestWithRetry(
        'POST',
        '/training/add_sample',
        formData,
        {
          headers: formData.getHeaders()
        }
      );

      logger.info(`Training sample added with ID: ${response.data.sample_id}`);
      return {
        success: true,
        sampleId: response.data.sample_id,
        result: response.data
      };

    } catch (error) {
      logger.error(`Failed to add training sample:`, error.message);
      throw new Error(`Adding training sample failed: ${error.message}`);
    }
  }

  /**
   * Get training dataset statistics
   */
  async getTrainingStats() {
    try {
      const response = await this.client.get('/training/stats');
      return {
        success: true,
        stats: response.data.dataset_stats
      };
    } catch (error) {
      logger.error('Failed to get training stats:', error.message);
      throw new Error(`Training stats failed: ${error.message}`);
    }
  }

  /**
   * Start model training
   */
  async startTraining(options = {}) {
    const {
      epochs = 5,
      batchSize = 8,
      learningRate = 1e-5
    } = options;

    try {
      const response = await this.client.post('/training/start', {
        epochs,
        batch_size: batchSize,
        learning_rate: learningRate
      });

      logger.info('ICR model training started');
      return {
        success: true,
        result: response.data
      };

    } catch (error) {
      logger.error('Failed to start ICR training:', error.message);
      throw new Error(`ICR training failed: ${error.message}`);
    }
  }

  /**
   * Get model information
   */
  async getModelInfo() {
    try {
      const response = await this.client.get('/model/info');
      return {
        success: true,
        modelInfo: response.data.model_info
      };
    } catch (error) {
      logger.error('Failed to get ICR model info:', error.message);
      throw new Error(`Model info failed: ${error.message}`);
    }
  }

  /**
   * Process handwriting with full pipeline
   */
  async processHandwriting(
    imagePath,
    options = {}
  ) {
    const {
      includePreprocessing = true,
      recognitionType = 'line_by_line',
      addToTraining = false,
      groundTruth = null,
      category = 'general'
    } = options;

    try {
      const results = {
        originalImage: imagePath,
        preprocessing: null,
        recognition: null,
        training: null
      };

      // Step 1: Preprocessing (if requested)
      if (includePreprocessing) {
        results.preprocessing = await this.preprocessHandwriting(imagePath, {
          taskType: 'line_recognition',
          returnSegments: true
        });
      }

      // Step 2: Recognition
      results.recognition = await this.recognizeHandwriting(imagePath, {
        recognitionType,
        preprocess: !includePreprocessing // Skip preprocessing if we already did it
      });

      // Step 3: Add to training data (if requested and ground truth provided)
      if (addToTraining && groundTruth) {
        try {
          results.training = await this.addTrainingSample(
            imagePath,
            groundTruth,
            { category }
          );
        } catch (error) {
          logger.warn('Failed to add to training data:', error.message);
          results.training = { success: false, error: error.message };
        }
      }

      return {
        success: true,
        results,
        summary: {
          recognizedText: results.recognition?.result?.recognized_text || 
                         results.recognition?.result?.lines?.map(l => l.text).join('\n') ||
                         results.recognition?.result?.words?.map(w => w.text).join(' '),
          confidence: this._calculateAverageConfidence(results.recognition?.result),
          lineCount: results.recognition?.result?.total_lines || 0,
          wordCount: results.recognition?.result?.total_words || 0,
          preprocessingApplied: includePreprocessing || results.recognition?.result?.preprocessing_applied,
          addedToTraining: results.training?.success || false
        }
      };

    } catch (error) {
      logger.error(`ICR processing failed for ${imagePath}:`, error.message);
      throw new Error(`ICR processing failed: ${error.message}`);
    }
  }

  /**
   * Batch process multiple handwriting images
   */
  async batchProcessHandwriting(
    imagePaths,
    options = {}
  ) {
    const results = [];
    const errors = [];

    for (const imagePath of imagePaths) {
      try {
        const result = await this.processHandwriting(imagePath, options);
        results.push({
          imagePath,
          ...result
        });
      } catch (error) {
        errors.push({
          imagePath,
          error: error.message
        });
      }
    }

    return {
      success: true,
      processed: results.length,
      failed: errors.length,
      total: imagePaths.length,
      results,
      errors
    };
  }

  /**
   * Calculate average confidence from recognition results
   */
  _calculateAverageConfidence(result) {
    if (!result) return 0;

    if (result.confidence !== undefined) {
      return result.confidence;
    }

    if (result.lines && result.lines.length > 0) {
      const sum = result.lines.reduce((acc, line) => acc + line.confidence, 0);
      return sum / result.lines.length;
    }

    if (result.words && result.words.length > 0) {
      const sum = result.words.reduce((acc, word) => acc + word.confidence, 0);
      return sum / result.words.length;
    }

    return 0;
  }

  /**
   * Make HTTP request with retry logic
   */
  async _makeRequestWithRetry(method, url, data, config = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        let response;
        
        if (method === 'GET') {
          response = await this.client.get(url, config);
        } else if (method === 'POST') {
          response = await this.client.post(url, data, config);
        } else if (method === 'PUT') {
          response = await this.client.put(url, data, config);
        } else if (method === 'DELETE') {
          response = await this.client.delete(url, config);
        }
        
        return response;
        
      } catch (error) {
        lastError = error;
        
        if (attempt === this.retryAttempts) {
          break;
        }
        
        // Only retry on network errors or 5xx status codes
        if (error.code === 'ECONNREFUSED' || 
            error.code === 'ETIMEDOUT' ||
            (error.response && error.response.status >= 500)) {
          
          logger.warn(`ICR request attempt ${attempt} failed, retrying in ${this.retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          continue;
        } else {
          // Don't retry on 4xx errors
          break;
        }
      }
    }
    
    throw lastError;
  }
}

module.exports = PythonICRIntegration;