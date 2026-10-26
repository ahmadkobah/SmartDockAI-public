/**
 * Enhanced OCR Service with Python Integration
 *
 * This service combines the existing JavaScript OCR with the new Python OCR microservice
 * for better accuracy and training capabilities.
 */

const OCRService = require('./OCRService');
const PythonOCRIntegration = require('./PythonOCRIntegration');
const storageService = require('./StorageService');

class EnhancedOCRService {
  constructor() {
    this.legacyOCRService = OCRService;
    this.pythonOCRService = new PythonOCRIntegration({
      pythonOCRBaseURL: process.env.PYTHON_OCR_URL || 'http://localhost:8000',
      timeout: 30000,
      retries: 3
    });
    
    this.isInitialized = false;
    this.pythonServiceAvailable = false;
    this.useTrainingMode = process.env.OCR_TRAINING_MODE === 'true';
  }

  /**
   * Initialize the enhanced OCR service
   */
  async initialize() {
    try {
      console.warn('🔍 Initializing Enhanced OCR Service...');
      
      // Initialize legacy service
      if (!this.legacyOCRService.isInitialized) {
        await this.legacyOCRService.initialize();
      }
      
      // Check Python service availability
      const healthCheck = await this.pythonOCRService.healthCheck();
      this.pythonServiceAvailable = healthCheck.status === 'healthy';
      
      if (this.pythonServiceAvailable) {
        console.warn('✅ Python OCR service is available');
        
        // Get engine info
        const engineInfo = await this.pythonOCRService.getEngineInfo();
        if (engineInfo.success) {
          console.warn(`📋 Python OCR Engine: ${engineInfo.data.name} v${engineInfo.data.version}`);
        }
      } else {
        console.warn('⚠️ Python OCR service unavailable, using legacy service');
      }
      
      this.isInitialized = true;
      console.warn('✅ Enhanced OCR Service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced OCR Service:', error);
      // Fall back to legacy service
      this.pythonServiceAvailable = false;
      this.isInitialized = true;
    }
  }

  /**
   * Process document with enhanced OCR capabilities
   */
  async processDocument(documentId, storageKey, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const {
        language = 'eng',
        documentType = 'general',
        preprocessingProfile = 'document',
        collectTrainingData = this.useTrainingMode,
        groundTruth = null,
        ...otherOptions
      } = options;

      // Get file from storage
      const fileBuffer = await storageService.getFile(storageKey);
      if (!fileBuffer) {
        throw new Error('Document file not found in storage');
      }

      // Try Python service first if available
      if (this.pythonServiceAvailable) {
        try {
          const result = await this._processWithPythonService(
            fileBuffer, 
            {
              language,
              documentType,
              preprocessingProfile,
              collectTrainingData: collectTrainingData && !groundTruth, // Only auto-collect if no ground truth
              ...otherOptions
            }
          );

          // If ground truth provided, collect training data
          if (groundTruth && this.useTrainingMode) {
            await this._collectTrainingData(fileBuffer, groundTruth, {
              language,
              documentType,
              preprocessingProfile,
              metadata: {
                documentId,
                storageKey,
                processedWith: 'python_service'
              }
            });
          }

          return {
            ...result,
            engine: 'python_tesseract',
            trainingDataCollected: Boolean(groundTruth && this.useTrainingMode)
          };

        } catch (error) {
          console.warn('Python OCR failed, falling back to legacy service:', error.message);
          this.pythonServiceAvailable = false;
        }
      }

      // Fall back to legacy JavaScript service
      const legacyResult = await this._processWithLegacyService(fileBuffer, options);
      
      return {
        ...legacyResult,
        engine: 'legacy_tesseract',
        trainingDataCollected: false
      };

    } catch (error) {
      console.error('Enhanced OCR processing failed:', error);
      throw error;
    }
  }

  /**
   * Process with Python OCR service
   */
  async _processWithPythonService(fileBuffer, options) {
    // Save buffer to temporary file
    const tempFilePath = await this._saveTempFile(fileBuffer);
    
    try {
      const result = await this.pythonOCRService.processDocument(tempFilePath, options);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Convert Python response to legacy format
      return this._convertPythonResponse(result.data);

    } finally {
      // Clean up temp file
      await this._cleanupTempFile(tempFilePath);
    }
  }

  /**
   * Process with legacy JavaScript service
   */
  async _processWithLegacyService(fileBuffer, options) {
    // Legacy service expects different format
    const legacyOptions = {
      language: options.language || 'eng',
      preprocessImage: options.preprocessingProfile !== 'none',
      oem: 1,
      psm: this._getPSMForDocumentType(options.documentType || 'general')
    };

    return this.legacyOCRService.extractTextFromImage(fileBuffer, legacyOptions);
  }

  /**
   * Collect training data with ground truth
   */
  async _collectTrainingData(fileBuffer, groundTruth, options) {
    if (!this.pythonServiceAvailable) {
      console.warn('Cannot collect training data: Python service unavailable');
      return null;
    }

    const tempFilePath = await this._saveTempFile(fileBuffer);
    
    try {
      const result = await this.pythonOCRService.collectTrainingData(
        tempFilePath, 
        groundTruth, 
        options
      );
      
      if (result.success) {
        console.warn(`✅ Training data collected: ${result.data.sample_id} (${result.data.accuracy_score.toFixed(1)}% accuracy)`);
        return result.data;
      } else {
        console.error('Training data collection failed:', result.error);
        return null;
      }

    } finally {
      await this._cleanupTempFile(tempFilePath);
    }
  }

  /**
   * Get training statistics
   */
  async getTrainingStatistics() {
    if (!this.pythonServiceAvailable) {
      return {
        available: false,
        message: 'Python OCR service unavailable'
      };
    }

    const result = await this.pythonOCRService.getTrainingStatistics();
    return {
      available: true,
      ...result
    };
  }

  /**
   * Get OCR engine information
   */
  async getEngineInfo() {
    const info = {
      enhanced_service: {
        initialized: this.isInitialized,
        python_service_available: this.pythonServiceAvailable,
        training_mode: this.useTrainingMode
      },
      legacy_service: this.legacyOCRService.getSupportedLanguages ? {
        supported_languages: this.legacyOCRService.getSupportedLanguages()
      } : {}
    };

    if (this.pythonServiceAvailable) {
      const pythonInfo = await this.pythonOCRService.getEngineInfo();
      if (pythonInfo.success) {
        info.python_service = pythonInfo.data;
      }
    }

    return info;
  }

  /**
   * Get available preprocessing profiles
   */
  async getPreprocessingProfiles() {
    if (!this.pythonServiceAvailable) {
      return {
        available: false,
        profiles: ['none', 'basic'],
        message: 'Python OCR service unavailable - limited profiles'
      };
    }

    const result = await this.pythonOCRService.getPreprocessingProfiles();
    return {
      available: true,
      ...result.data
    };
  }

  /**
   * Convert Python OCR response to legacy format
   */
  _convertPythonResponse(pythonData) {
    return {
      text: pythonData.text,
      confidence: pythonData.confidence,
      words: pythonData.words,
      lines: pythonData.lines,
      paragraphs: pythonData.paragraphs || [],
      metadata: {
        ...pythonData.metadata,
        language: pythonData.language,
        processingTime: pythonData.processing_time,
        engine: 'python_tesseract'
      }
    };
  }

  /**
   * Get PSM (Page Segmentation Mode) for document type
   */
  _getPSMForDocumentType(documentType) {
    const psmMap = {
      'invoice': 6,     // Uniform block of text
      'identity': 8,    // Single word
      'contract': 3,    // Fully automatic page segmentation
      'handwriting': 8, // Single word
      'general': 3      // Fully automatic page segmentation
    };
    
    return psmMap[documentType] || 3;
  }

  /**
   * Save buffer to temporary file
   */
  async _saveTempFile(buffer) {
    const fs = require('fs').promises;
    const path = require('path');
    const os = require('os');
    const crypto = require('crypto');
    
    const tempDir = os.tmpdir();
    const filename = `ocr_temp_${crypto.randomBytes(8).toString('hex')}.png`;
    const tempFilePath = path.join(tempDir, filename);
    
    await fs.writeFile(tempFilePath, buffer);
    return tempFilePath;
  }

  /**
   * Clean up temporary file
   */
  async _cleanupTempFile(filePath) {
    try {
      const fs = require('fs').promises;
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('Failed to cleanup temp file:', error.message);
    }
  }

  /**
   * Health check for the enhanced OCR service
   */
  async healthCheck() {
    const health = {
      enhanced_service: {
        status: this.isInitialized ? 'healthy' : 'not_initialized',
        training_mode: this.useTrainingMode
      },
      legacy_service: {
        status: this.legacyOCRService.isInitialized ? 'healthy' : 'not_initialized'
      }
    };

    if (this.pythonServiceAvailable) {
      const pythonHealth = await this.pythonOCRService.healthCheck();
      health.python_service = pythonHealth;
    } else {
      health.python_service = {
        status: 'unavailable',
        message: 'Python OCR service not accessible'
      };
    }

    return health;
  }

  // Backward compatibility methods
  async extractTextFromImage(imageBuffer, options = {}) {
    return this.processDocument(null, null, {
      ...options,
      fileBuffer: imageBuffer
    });
  }

  isSupportedFormat(mimeType) {
    return this.legacyOCRService.isSupportedFormat(mimeType);
  }

  getSupportedLanguages() {
    if (this.legacyOCRService.getSupportedLanguages) {
      return this.legacyOCRService.getSupportedLanguages();
    }
    return ['eng', 'deu', 'fra', 'spa']; // Default languages
  }
}

module.exports = new EnhancedOCRService();