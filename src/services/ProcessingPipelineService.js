const crypto = require('crypto');
const queueService = require('./QueueService');
const ocrService = require('./OCRService');
const storageService = require('./StorageService');

class ProcessingPipelineService {
  constructor() {
    this.pipelines = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the processing pipeline service
   */
  async initialize() {
    try {
      console.warn('⚙️ Initializing Processing Pipeline Service...');
      
      // Initialize dependencies
      if (!queueService.isInitialized) {
        await queueService.initialize();
      }

      if (!ocrService.isInitialized) {
        await ocrService.initialize();
      }

      // Register default pipelines
      this.registerDefaultPipelines();

      this.isInitialized = true;
      console.warn('✅ Processing Pipeline Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Processing Pipeline Service:', error);
      throw error;
    }
  }

  /**
   * Register default processing pipelines
   */
  registerDefaultPipelines() {
    // Default document processing pipeline
    this.registerPipeline('default', {
      name: 'Default Document Processing',
      description: 'Standard pipeline for general document processing',
      steps: [
        { type: 'preprocess', config: { enhanceContrast: true, denoise: true } },
        { type: 'ocr', config: { language: 'eng', preprocessImage: true } },
        { type: 'metadata_extraction', config: { documentType: 'general' } },
        { type: 'validation', config: {} }
      ]
    });

    // Invoice processing pipeline
    this.registerPipeline('invoice', {
      name: 'Invoice Processing Pipeline',
      description: 'Specialized pipeline for invoice documents',
      steps: [
        { type: 'preprocess', config: { enhanceContrast: true, denoise: true, resize: true } },
        { type: 'ocr', config: { language: 'eng', preprocessImage: true, psm: 6 } },
        { type: 'metadata_extraction', config: { documentType: 'invoice' } },
        { type: 'invoice_validation', config: { validateAmounts: true } },
        { type: 'validation', config: {} }
      ]
    });

    // Identity document pipeline
    this.registerPipeline('identity', {
      name: 'Identity Document Pipeline',
      description: 'Pipeline for ID cards, passports, and licenses',
      steps: [
        { type: 'preprocess', config: { enhanceContrast: true, denoise: true } },
        { type: 'ocr', config: { language: 'eng', preprocessImage: true, psm: 8 } },
        { type: 'metadata_extraction', config: { documentType: 'identity' } },
        { type: 'identity_validation', config: { validateDates: true } },
        { type: 'validation', config: {} }
      ]
    });

    // Contract processing pipeline
    this.registerPipeline('contract', {
      name: 'Contract Processing Pipeline',
      description: 'Pipeline for legal contract documents',
      steps: [
        { type: 'preprocess', config: { enhanceContrast: false, denoise: true } },
        { type: 'ocr', config: { language: 'eng', preprocessImage: true, psm: 3 } },
        { type: 'metadata_extraction', config: { documentType: 'contract' } },
        { type: 'contract_validation', config: { validateDates: true, extractParties: true } },
        { type: 'validation', config: {} }
      ]
    });

    console.warn(`📋 Registered ${this.pipelines.size} default processing pipelines`);
  }

  /**
   * Register a new processing pipeline
   */
  registerPipeline(pipelineId, config) {
    this.pipelines.set(pipelineId, {
      id: pipelineId,
      ...config,
      registeredAt: new Date().toISOString()
    });
    
    console.warn(`📋 Registered pipeline: ${pipelineId} - ${config.name}`);
  }

  /**
   * Get available pipelines
   */
  getAvailablePipelines() {
    return Array.from(this.pipelines.values()).map(pipeline => ({
      id: pipeline.id,
      name: pipeline.name,
      description: pipeline.description,
      stepCount: pipeline.steps.length,
      registeredAt: pipeline.registeredAt
    }));
  }

  /**
   * Get pipeline configuration
   */
  getPipelineConfig(pipelineId) {
    return this.pipelines.get(pipelineId);
  }

  /**
   * Execute processing pipeline for a document
   */
  async executeProcessingPipeline(documentVersionId, storageKey, pipelineId = 'default', options = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const pipeline = this.pipelines.get(pipelineId);
      if (!pipeline) {
        throw new Error(`Pipeline not found: ${pipelineId}`);
      }

      console.warn(`🚀 Starting pipeline execution: ${pipeline.name} for document ${documentVersionId}`);

      const instanceId = this.generateInstanceId();
      const execution = {
        instanceId,
        documentVersionId,
        pipelineId,
        pipeline: pipeline.name,
        status: 'running',
        startedAt: new Date().toISOString(),
        steps: [],
        results: {},
        options
      };

      try {
        // Execute each step in the pipeline
        for (let i = 0; i < pipeline.steps.length; i++) {
          const step = pipeline.steps[i];
          const stepResult = await this.executeStep(
            step,
            documentVersionId,
            storageKey,
            execution.results,
            options
          );

          execution.steps.push({
            stepNumber: i + 1,
            type: step.type,
            status: stepResult.success ? 'completed' : 'failed',
            result: stepResult,
            executedAt: new Date().toISOString()
          });

          if (!stepResult.success) {
            throw new Error(`Step ${step.type} failed: ${stepResult.error}`);
          }

          // Store step results for next steps
          execution.results[step.type] = stepResult.data;
        }

        execution.status = 'completed';
        execution.finishedAt = new Date().toISOString();

        console.warn(`✅ Pipeline execution completed: ${instanceId} for document ${documentVersionId}`);
        
        return execution;
      } catch (error) {
        execution.status = 'failed';
        execution.error = error.message;
        execution.finishedAt = new Date().toISOString();
        
        console.error(`❌ Pipeline execution failed: ${instanceId} - ${error.message}`);
        throw error;
      }
    } catch (error) {
      console.error('Pipeline execution error:', error);
      throw error;
    }
  }

  /**
   * Execute a single pipeline step
   */
  async executeStep(step, documentVersionId, storageKey, previousResults, options) {
    try {
      console.warn(`⚙️ Executing step: ${step.type} for document ${documentVersionId}`);

      switch (step.type) {
        case 'preprocess':
          return await this.executePreprocessStep(storageKey, step.config, options);

        case 'ocr':
          return await this.executeOCRStep(storageKey, step.config, previousResults, options);

        case 'metadata_extraction':
          return await this.executeMetadataStep(step.config, previousResults, options);

        case 'validation':
          return await this.executeValidationStep(previousResults, step.config, options);

        case 'invoice_validation':
          return await this.executeInvoiceValidationStep(previousResults, step.config, options);

        case 'identity_validation':
          return await this.executeIdentityValidationStep(previousResults, step.config, options);

        case 'contract_validation':
          return await this.executeContractValidationStep(previousResults, step.config, options);

        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stepType: step.type
      };
    }
  }

  /**
   * Execute preprocessing step
   */
  async executePreprocessStep(storageKey, config, _options) {
    try {
      // For now, preprocessing is handled within OCR
      // This step validates the file exists and is accessible
      if (!storageService.isConnected) {
        await storageService.connect();
      }

      const fileInfo = await storageService.getFileInfo(storageKey);
      
      return {
        success: true,
        data: {
          fileInfo,
          preprocessingConfig: config,
          status: 'ready_for_ocr'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute OCR step
   */
  async executeOCRStep(storageKey, config, _previousResults, options) {
    try {
      // Download file from storage
      if (!storageService.isConnected) {
        await storageService.connect();
      }
      
      const fileStream = await storageService.downloadFile(storageKey);
      const chunks = [];
      
      for await (const chunk of fileStream) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);

      // Execute OCR
      const ocrResult = await ocrService.extractTextFromImage(fileBuffer, {
        ...config,
        ...options.ocrOptions
      });

      return {
        success: true,
        data: ocrResult
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute metadata extraction step
   */
  async executeMetadataStep(config, previousResults, _options) {
    try {
      const ocrData = previousResults.ocr;
      if (!ocrData || !ocrData.text) {
        throw new Error('No OCR text available for metadata extraction');
      }

      const metadata = ocrService.extractMetadataFromText(
        ocrData.text,
        config.documentType || 'general'
      );

      return {
        success: true,
        data: {
          metadata,
          documentType: config.documentType,
          textLength: ocrData.text.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute basic validation step
   */
  async executeValidationStep(previousResults, _config, _options) {
    try {
      const validation = {
        hasOCRText: !!(previousResults.ocr && previousResults.ocr.text),
        textLength: previousResults.ocr ? previousResults.ocr.text.length : 0,
        confidence: previousResults.ocr ? previousResults.ocr.confidence : 0,
        hasMetadata: !!(previousResults.metadata_extraction),
        metadataFields: previousResults.metadata_extraction ? 
          Object.keys(previousResults.metadata_extraction.data.metadata || {}).length : 0
      };

      validation.isValid = validation.hasOCRText && validation.textLength > 10 && validation.confidence > 30;

      return {
        success: true,
        data: validation
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute invoice-specific validation
   */
  async executeInvoiceValidationStep(previousResults, config, _options) {
    try {
      const metadata = previousResults.metadata_extraction?.data?.metadata || {};
      
      const validation = {
        hasInvoiceNumber: !!metadata.invoiceNumber,
        hasAmount: !!metadata.amount,
        hasDate: !!metadata.date,
        hasVendor: !!metadata.vendor,
        amountValid: config.validateAmounts ? this.validateAmount(metadata.amount) : true
      };

      validation.score = Object.values(validation).filter(Boolean).length / Object.keys(validation).length;
      validation.isValid = validation.score >= 0.6; // 60% of fields must be valid

      return {
        success: true,
        data: validation
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute identity document validation
   */
  async executeIdentityValidationStep(previousResults, config, _options) {
    try {
      const metadata = previousResults.metadata_extraction?.data?.metadata || {};
      
      const validation = {
        hasName: !!metadata.name,
        hasDocumentNumber: !!metadata.documentNumber,
        hasExpirationDate: !!metadata.expirationDate,
        expirationValid: config.validateDates ? this.validateExpirationDate(metadata.expirationDate) : true
      };

      validation.score = Object.values(validation).filter(Boolean).length / Object.keys(validation).length;
      validation.isValid = validation.score >= 0.75; // 75% of fields must be valid

      return {
        success: true,
        data: validation
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute contract validation
   */
  async executeContractValidationStep(previousResults, config, _options) {
    try {
      const metadata = previousResults.metadata_extraction?.data?.metadata || {};
      
      const validation = {
        hasParties: !!(metadata.parties && metadata.parties.length > 0),
        hasEffectiveDate: !!metadata.effectiveDate,
        hasExpirationDate: !!metadata.expirationDate,
        datesValid: config.validateDates ? this.validateContractDates(metadata) : true
      };

      validation.score = Object.values(validation).filter(Boolean).length / Object.keys(validation).length;
      validation.isValid = validation.score >= 0.6; // 60% of fields must be valid

      return {
        success: true,
        data: validation
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Validation helper methods
  validateAmount(amount) {
    if (!amount) return false;
    const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
    return !isNaN(numericAmount) && numericAmount > 0;
  }

  validateExpirationDate(dateStr) {
    if (!dateStr) return false;
    
    try {
      const date = new Date(dateStr);
      const now = new Date();
      return date > now; // Must be in the future
    } catch {
      return false;
    }
  }

  validateContractDates(metadata) {
    const { effectiveDate, expirationDate } = metadata;
    
    if (!effectiveDate || !expirationDate) return false;
    
    try {
      const effective = new Date(effectiveDate);
      const expiration = new Date(expirationDate);
      return effective < expiration; // Effective date must be before expiration
    } catch {
      return false;
    }
  }

  /**
   * Generate unique instance ID
   */
  generateInstanceId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Get pipeline execution statistics
   */
  async getPipelineStats() {
    try {
      const queueStats = await queueService.getQueueStats('ocr');
      
      return {
        availablePipelines: this.pipelines.size,
        queueStatus: queueStats,
        supportedDocumentTypes: ['general', 'invoice', 'identity', 'contract'],
        registeredPipelines: this.getAvailablePipelines()
      };
    } catch (error) {
      return {
        error: error.message,
        availablePipelines: this.pipelines.size
      };
    }
  }
}

module.exports = new ProcessingPipelineService();