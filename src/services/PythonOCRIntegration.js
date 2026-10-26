/**
 * Node.js Integration Service
 *
 * Provides integration between the Node.js backend and Python OCR microservice.
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { URLSearchParams } = require('url');

class PythonOCRIntegration {
  constructor(config = {}) {
    this.baseURL = config.pythonOCRBaseURL || 'http://localhost:8000';
    this.timeout = config.timeout || 30000; // 30 seconds
    this.retries = config.retries || 3;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Check health of Python OCR service
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return {
        status: 'healthy',
        pythonService: response.data
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Process document with Python OCR service
   */
  async processDocument(filePath, options = {}) {
    const {
      language = 'eng',
      documentType = 'general',
      preprocessingProfile = 'document',
      collectTrainingData = false
    } = options;

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      
      // Add OCR parameters as query string
      const params = new URLSearchParams({
        language,
        document_type: documentType,
        preprocessing_profile: preprocessingProfile,
        collect_training_data: collectTrainingData.toString()
      });

      const response = await this.client.post(
        `/ocr/process?${params.toString()}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('Python OCR processing failed:', error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Collect training data with ground truth
   */
  async collectTrainingData(filePath, groundTruth, options = {}) {
    const {
      language = 'eng',
      documentType = 'general',
      preprocessingProfile = 'document',
      metadata = {}
    } = options;

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      
      // Add training parameters as query string
      const params = new URLSearchParams({
        ground_truth: groundTruth,
        language,
        document_type: documentType,
        preprocessing_profile: preprocessingProfile,
        metadata: JSON.stringify(metadata)
      });

      const response = await this.client.post(
        `/training/collect?${params.toString()}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('Training data collection failed:', error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get training statistics
   */
  async getTrainingStatistics() {
    try {
      const response = await this.client.get('/training/statistics');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get OCR engine information
   */
  async getEngineInfo() {
    try {
      const response = await this.client.get('/engines/info');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get available preprocessing profiles
   */
  async getPreprocessingProfiles() {
    try {
      const response = await this.client.get('/preprocessing/profiles');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }
}

module.exports = PythonOCRIntegration;