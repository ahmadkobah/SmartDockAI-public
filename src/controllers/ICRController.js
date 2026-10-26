const { Document } = require('../models');
const EnhancedICRService = require('../services/EnhancedICRService');
const PythonICRIntegration = require('../services/PythonICRIntegration');
const queueService = require('../services/QueueService');
const storageService = require('../services/StorageService');
const { logger } = require('../utils');
const multer = require('multer');

/**
 * ICR Controller - Handle Intelligent Character Recognition operations
 * Specialized for handwritten text, signatures, and complex forms
 */
class ICRController {
  constructor() {
    this.enhancedICRService = new EnhancedICRService();
    this.pythonICRService = new PythonICRIntegration();
  this.queueService = queueService;
  this.storageService = storageService;

    // Configure multer for file uploads
    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
        }
      }
    });
  }

  /**
   * Process handwriting recognition for an existing document
   * POST /api/icr/documents/:documentId/process
   */
  async processDocument(req, res) {
    try {
      const { documentId } = req.params;
      const { 
        mode = 'handwriting',
        language = 'en',
        priority = 10,
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

      // Initialize services if needed
      if (!this.enhancedICRService.isInitialized) {
        await this.enhancedICRService.initialize();
      }

      // Check if document supports ICR
      const supportedFormats = ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp', 'application/pdf'];
      if (!supportedFormats.includes(document.mimeType)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: `ICR not supported for file type: ${document.mimeType}`
        });
      }

      // Get file from storage
      const fileBuffer = await this.storageService.getFile(document.storageKey);
      
      // Process with ICR
      const result = await this.enhancedICRService.processHandwriting(fileBuffer, {
        mode,
        language,
        options: {
          ...options,
          documentId: document.id,
          priority
        }
      });

      res.json({
        message: 'ICR processing completed successfully',
        data: {
          documentId: document.id,
          mode,
          language,
          extractedText: result.extractedText,
          confidence: result.confidence,
          handwritingRegions: result.handwritingRegions,
          signatures: result.signatures,
          processingTime: result.processingTime,
          metadata: result.metadata
        }
      });

    } catch (error) {
      logger.error('ICR process document error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to process document with ICR'
      });
    }
  }

  /**
   * Upload and process file directly with ICR
   * POST /api/icr/upload
   */
  async uploadAndProcess(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'No file uploaded'
        });
      }

      const { 
        mode = 'handwriting',
        language = 'en',
        filename,
        options = {}
      } = req.body;

      // Initialize services
      if (!this.enhancedICRService.isInitialized) {
        await this.enhancedICRService.initialize();
      }

      // Process file directly
      const result = await this.enhancedICRService.processHandwriting(req.file.buffer, {
        mode,
        language,
        options: {
          ...JSON.parse(options || '{}'),
          filename: filename || req.file.originalname
        }
      });

      res.json({
        message: 'File processed with ICR successfully',
        data: {
          filename: filename || req.file.originalname,
          mode,
          language,
          extractedText: result.extractedText,
          confidence: result.confidence,
          handwritingRegions: result.handwritingRegions,
          signatures: result.signatures,
          processingTime: result.processingTime,
          metadata: result.metadata
        }
      });

    } catch (error) {
      logger.error('ICR upload and process error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to upload and process file with ICR'
      });
    }
  }

  /**
   * Analyze handwriting regions in a document
   * POST /api/icr/analyze/handwriting
   */
  async analyzeHandwriting(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'No file uploaded'
        });
      }

      const { language = 'en', options = {} } = req.body;

      const result = await this.pythonICRService.analyzeHandwriting(req.file.buffer, {
        language,
        ...JSON.parse(options || '{}')
      });

      res.json({
        message: 'Handwriting analysis completed',
        data: result
      });

    } catch (error) {
      logger.error('Handwriting analysis error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to analyze handwriting'
      });
    }
  }

  /**
   * Detect and verify signatures
   * POST /api/icr/signatures/detect
   */
  async detectSignatures(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'No file uploaded'
        });
      }

      const { options = {} } = req.body;

      const result = await this.pythonICRService.detectSignatures(req.file.buffer, {
        ...JSON.parse(options || '{}')
      });

      res.json({
        message: 'Signature detection completed',
        data: result
      });

    } catch (error) {
      logger.error('Signature detection error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to detect signatures'
      });
    }
  }

  /**
   * Process structured forms with handwritten fields
   * POST /api/icr/forms/process
   */
  async processForms(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'No file uploaded'
        });
      }

      const { 
        formType = 'generic',
        language = 'en',
        template,
        options = {}
      } = req.body;

      const result = await this.pythonICRService.processForm(req.file.buffer, {
        formType,
        language,
        template: template ? JSON.parse(template) : null,
        ...JSON.parse(options || '{}')
      });

      res.json({
        message: 'Form processing completed',
        data: result
      });

    } catch (error) {
      logger.error('Form processing error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to process form'
      });
    }
  }

  /**
   * Get available form templates
   * GET /api/icr/forms/templates
   */
  async getFormTemplates(req, res) {
    try {
      const templates = await this.pythonICRService.getFormTemplates();

      res.json({
        message: 'Form templates retrieved successfully',
        data: {
          templates,
          count: templates.length
        }
      });

    } catch (error) {
      logger.error('Get form templates error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get form templates'
      });
    }
  }

  /**
   * Get ICR service capabilities and configuration
   * GET /api/icr/capabilities
   */
  async getCapabilities(req, res) {
    try {
      const capabilities = {
        handwritingRecognition: {
          supported: true,
          languages: await this.pythonICRService.getSupportedLanguages(),
          modes: ['handwriting', 'cursive', 'print', 'mixed']
        },
        signatureDetection: {
          supported: true,
          features: ['detection', 'verification', 'matching']
        },
        formProcessing: {
          supported: true,
          types: ['generic', 'tax', 'insurance', 'medical', 'legal'],
          templates: await this.pythonICRService.getFormTemplates()
        },
        supportedFormats: ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp', 'application/pdf'],
        maxFileSize: '50MB',
        features: {
          batchProcessing: true,
          realTimeProcessing: true,
          confidenceScoring: true,
          regionDetection: true,
          textNormalization: true
        }
      };

      res.json({
        message: 'ICR capabilities retrieved successfully',
        data: capabilities
      });

    } catch (error) {
      logger.error('Get ICR capabilities error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get ICR capabilities'
      });
    }
  }

  /**
   * Get ICR service health and statistics
   * GET /api/icr/health
   */
  async getHealth(req, res) {
    try {
      const health = await this.pythonICRService.checkHealth();
      const serviceInfo = await this.pythonICRService.getServiceInfo();

      res.json({
        message: 'ICR service health retrieved successfully',
        data: {
          health,
          serviceInfo,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Get ICR health error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get ICR service health'
      });
    }
  }

  /**
   * Get ICR processing statistics (Admin only)
   * GET /api/icr/admin/statistics
   */
  async getStatistics(req, res) {
    try {
      // This would be implemented with actual database queries
      const statistics = {
        totalProcessed: 0,
        averageConfidence: 0,
        averageProcessingTime: 0,
        handwritingAccuracy: 0,
        signatureDetectionRate: 0,
        formProcessingSuccess: 0,
        languageDistribution: {},
        recentActivity: [],
        performanceMetrics: {}
      };

      res.json({
        message: 'ICR statistics retrieved successfully',
        data: statistics
      });

    } catch (error) {
      logger.error('Get ICR statistics error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get ICR statistics'
      });
    }
  }

  /**
   * Batch process multiple documents with ICR
   * POST /api/icr/batch
   */
  async batchProcess(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'No files uploaded'
        });
      }

      const { 
        mode = 'handwriting',
        language = 'en',
        options = {}
      } = req.body;

      const results = [];
      const parsedOptions = JSON.parse(options || '{}');

      // Initialize services
      if (!this.enhancedICRService.isInitialized) {
        await this.enhancedICRService.initialize();
      }

      // Process each file
      for (const file of req.files) {
        try {
          const result = await this.enhancedICRService.processHandwriting(file.buffer, {
            mode,
            language,
            options: {
              ...parsedOptions,
              filename: file.originalname
            }
          });

          results.push({
            filename: file.originalname,
            success: true,
            data: result
          });
        } catch (error) {
          results.push({
            filename: file.originalname,
            success: false,
            error: error.message
          });
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      res.json({
        message: 'Batch ICR processing completed',
        data: {
          processed: req.files.length,
          successful,
          failed,
          results
        }
      });

    } catch (error) {
      logger.error('ICR batch process error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to process batch ICR'
      });
    }
  }
}

module.exports = new ICRController();