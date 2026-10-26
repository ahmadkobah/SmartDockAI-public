/**
 * Enhanced ICR Service
 * 
 * Combines OCR (printed text) and ICR (handwriting) recognition capabilities
 * with intelligent routing based on content analysis.
 */

const PythonOCRIntegration = require('./PythonOCRIntegration');
const PythonICRIntegration = require('./PythonICRIntegration');
const { logger } = require('../utils');

class EnhancedICRService {
  constructor() {
    this.ocrService = new PythonOCRIntegration();
    this.icrService = new PythonICRIntegration();
    this.isInitialized = false;
  }

  /**
   * Initialize the service and check health of both OCR and ICR services
   */
  async initialize() {
    try {
      // Check OCR service health
      const ocrHealth = await this.ocrService.checkHealth();
      const icrHealth = await this.icrService.checkHealth();

      this.isInitialized = ocrHealth.status === 'healthy' && icrHealth.status === 'healthy';
      
      if (this.isInitialized) {
        logger.info('Enhanced ICR Service initialized successfully');
        return {
          success: true,
          services: {
            ocr: ocrHealth,
            icr: icrHealth
          }
        };
      } else {
        throw new Error(`Service health check failed - OCR: ${ocrHealth.status}, ICR: ${icrHealth.status}`);
      }
    } catch (error) {
      logger.error('Failed to initialize Enhanced ICR Service:', error.message);
      throw error;
    }
  }

  /**
   * Analyze image to determine content type (printed text vs handwriting)
   */
  async analyzeContentType(imagePath) {
    try {
      // Use OCR preprocessing to analyze image characteristics
      const ocrPreprocessing = await this.ocrService.preprocessImage(imagePath, {
        returnMetadata: true
      });
      
      // Use ICR preprocessing to analyze handwriting characteristics  
      const icrPreprocessing = await this.icrService.preprocessHandwriting(imagePath, {
        taskType: 'line_recognition',
        returnSegments: false
      });

      // Analyze results to determine content type
      const analysis = this._analyzeImageCharacteristics(
        ocrPreprocessing.result,
        icrPreprocessing.result
      );

      return {
        contentType: analysis.primaryType,
        confidence: analysis.confidence,
        mixedContent: analysis.mixedContent,
        recommendations: analysis.recommendations,
        metadata: {
          ocr: ocrPreprocessing.result?.preprocessing_metadata || {},
          icr: icrPreprocessing.result?.metadata || {}
        }
      };

    } catch (error) {
      logger.error(`Content type analysis failed for ${imagePath}:`, error.message);
      // Default to mixed content if analysis fails
      return {
        contentType: 'mixed',
        confidence: 0.5,
        mixedContent: true,
        recommendations: ['process_with_both_ocr_and_icr'],
        metadata: {}
      };
    }
  }

  /**
   * Process image with appropriate recognition method based on content analysis
   */
  async processImage(imagePath, options = {}) {
    const {
      forceMethod = null, // 'ocr', 'icr', or null for auto-detection
      includeAnalysis = true,
      addToTraining = false,
      groundTruth = null,
      category = 'general'
    } = options;

    try {
      let processingMethod = forceMethod;
      let analysis = null;

      // Auto-detect content type if not forced
      if (!processingMethod && includeAnalysis) {
        analysis = await this.analyzeContentType(imagePath);
        processingMethod = this._selectProcessingMethod(analysis);
      } else if (!processingMethod) {
        processingMethod = 'mixed'; // Default to mixed processing
      }

      const results = {
        imagePath,
        processingMethod,
        analysis,
        ocr: null,
        icr: null,
        combined: null
      };

      // Process with selected method(s)
      if (processingMethod === 'ocr') {
        results.ocr = await this.ocrService.processImage(imagePath, {
          includePreprocessing: true,
          addToTraining,
          groundTruth,
          category
        });
      } else if (processingMethod === 'icr') {
        results.icr = await this.icrService.processHandwriting(imagePath, {
          includePreprocessing: true,
          recognitionType: 'line_by_line',
          addToTraining,
          groundTruth,
          category
        });
      } else {
        // Mixed content - process with both
        const [ocrResult, icrResult] = await Promise.allSettled([
          this.ocrService.processImage(imagePath, {
            includePreprocessing: true,
            addToTraining: false // Don't add to training for mixed content
          }),
          this.icrService.processHandwriting(imagePath, {
            includePreprocessing: true,
            recognitionType: 'line_by_line',
            addToTraining: false
          })
        ]);

        results.ocr = ocrResult.status === 'fulfilled' ? ocrResult.value : null;
        results.icr = icrResult.status === 'fulfilled' ? icrResult.value : null;
      }

      // Combine results if both methods were used
      if (results.ocr && results.icr) {
        results.combined = this._combineResults(results.ocr, results.icr, analysis);
      }

      return {
        success: true,
        processingMethod,
        analysis,
        extractedText: this._extractFinalText(results),
        confidence: this._calculateFinalConfidence(results),
        results,
        summary: {
          method: processingMethod,
          textLength: this._extractFinalText(results).length,
          confidence: this._calculateFinalConfidence(results),
          hasOCR: !!results.ocr,
          hasICR: !!results.icr,
          hasCombined: !!results.combined
        }
      };

    } catch (error) {
      logger.error(`Enhanced ICR processing failed for ${imagePath}:`, error.message);
      throw new Error(`Enhanced ICR processing failed: ${error.message}`);
    }
  }

  /**
   * Add training sample with automatic content type detection
   */
  async addTrainingSample(imagePath, groundTruth, options = {}) {
    const {
      category = 'general',
      forceMethod = null,
      metadata = {}
    } = options;

    try {
      let method = forceMethod;
      
      // Auto-detect content type if not specified
      if (!method) {
        const analysis = await this.analyzeContentType(imagePath);
        method = this._selectProcessingMethod(analysis);
      }

      const results = {
        ocr: null,
        icr: null
      };

      // Add to appropriate training dataset(s)
      if (method === 'ocr' || method === 'mixed') {
        try {
          results.ocr = await this.ocrService.addTrainingSample(
            imagePath,
            groundTruth,
            { category, metadata }
          );
        } catch (error) {
          logger.warn('Failed to add OCR training sample:', error.message);
        }
      }

      if (method === 'icr' || method === 'mixed') {
        try {
          results.icr = await this.icrService.addTrainingSample(
            imagePath,
            groundTruth,
            { category, metadata }
          );
        } catch (error) {
          logger.warn('Failed to add ICR training sample:', error.message);
        }
      }

      return {
        success: true,
        method,
        results,
        sampleIds: {
          ocr: results.ocr?.sampleId || null,
          icr: results.icr?.sampleId || null
        }
      };

    } catch (error) {
      logger.error('Failed to add training sample:', error.message);
      throw new Error(`Adding training sample failed: ${error.message}`);
    }
  }

  /**
   * Get combined training statistics from both services
   */
  async getTrainingStats() {
    try {
      const [ocrStats, icrStats] = await Promise.allSettled([
        this.ocrService.getTrainingStats(),
        this.icrService.getTrainingStats()
      ]);

      return {
        success: true,
        ocr: ocrStats.status === 'fulfilled' ? ocrStats.value.stats : null,
        icr: icrStats.status === 'fulfilled' ? icrStats.value.stats : null,
        combined: {
          totalSamples: (ocrStats.value?.stats?.total_samples || 0) + 
                       (icrStats.value?.stats?.total_samples || 0),
          services: {
            ocrAvailable: ocrStats.status === 'fulfilled',
            icrAvailable: icrStats.status === 'fulfilled'
          }
        }
      };
    } catch (error) {
      logger.error('Failed to get training stats:', error.message);
      throw new Error(`Training stats failed: ${error.message}`);
    }
  }

  /**
   * Start training for both OCR and ICR models
   */
  async startTraining(options = {}) {
    const {
      trainOCR = true,
      trainICR = true,
      ocrOptions = {},
      icrOptions = {}
    } = options;

    try {
      const results = {
        ocr: null,
        icr: null
      };

      const promises = [];

      if (trainOCR) {
        promises.push(
          this.ocrService.startTraining(ocrOptions)
            .then(result => ({ type: 'ocr', result }))
            .catch(error => ({ type: 'ocr', error: error.message }))
        );
      }

      if (trainICR) {
        promises.push(
          this.icrService.startTraining(icrOptions)
            .then(result => ({ type: 'icr', result }))
            .catch(error => ({ type: 'icr', error: error.message }))
        );
      }

      const trainingResults = await Promise.allSettled(promises);
      
      for (const result of trainingResults) {
        if (result.status === 'fulfilled') {
          results[result.value.type] = result.value.result || result.value.error;
        }
      }

      return {
        success: true,
        results,
        summary: {
          ocrStarted: !!results.ocr && !results.ocr.error,
          icrStarted: !!results.icr && !results.icr.error
        }
      };

    } catch (error) {
      logger.error('Failed to start training:', error.message);
      throw new Error(`Training start failed: ${error.message}`);
    }
  }

  /**
   * Analyze image characteristics to determine content type
   */
  _analyzeImageCharacteristics(ocrMetadata, icrMetadata) {
    const analysis = {
      primaryType: 'mixed',
      confidence: 0.5,
      mixedContent: true,
      recommendations: []
    };

    try {
      // Analyze OCR preprocessing results
      const ocrScore = this._calculateOCRScore(ocrMetadata);
      const icrScore = this._calculateICRScore(icrMetadata);

      const threshold = 0.7;
      
      if (ocrScore > threshold && ocrScore > icrScore * 1.2) {
        analysis.primaryType = 'ocr';
        analysis.confidence = ocrScore;
        analysis.mixedContent = false;
        analysis.recommendations = ['use_ocr_processing'];
      } else if (icrScore > threshold && icrScore > ocrScore * 1.2) {
        analysis.primaryType = 'icr';
        analysis.confidence = icrScore;
        analysis.mixedContent = false;
        analysis.recommendations = ['use_icr_processing'];
      } else {
        analysis.primaryType = 'mixed';
        analysis.confidence = Math.max(ocrScore, icrScore);
        analysis.mixedContent = true;
        analysis.recommendations = ['use_both_ocr_and_icr'];
      }

    } catch (error) {
      logger.warn('Error in image characteristic analysis:', error.message);
    }

    return analysis;
  }

  /**
   * Calculate OCR suitability score
   */
  _calculateOCRScore(metadata) {
    let score = 0.5; // Base score

    if (metadata?.text_regions_detected) {
      score += 0.2;
    }
    
    if (metadata?.font_analysis?.is_printed) {
      score += 0.3;
    }
    
    if (metadata?.image_quality?.sharpness > 0.7) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate ICR suitability score
   */
  _calculateICRScore(metadata) {
    let score = 0.5; // Base score

    if (metadata?.line_count > 0) {
      score += 0.2;
    }
    
    if (metadata?.skew_angle && Math.abs(metadata.skew_angle) > 0) {
      score += 0.1; // Handwriting often has skew
    }
    
    // More lines might indicate handwriting
    const lineCount = metadata?.segment_counts?.lines || 0;
    if (lineCount > 3) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Select processing method based on analysis
   */
  _selectProcessingMethod(analysis) {
    if (analysis.confidence > 0.7) {
      return analysis.primaryType;
    }
    return 'mixed';
  }

  /**
   * Combine OCR and ICR results
   */
  _combineResults(ocrResult, icrResult, _analysis) {
    const combined = {
      text: '',
      confidence: 0,
      method: 'combined',
      sources: {
        ocr: ocrResult.summary || ocrResult.results,
        icr: icrResult.summary || icrResult.results
      }
    };

    // Combine text based on confidence
    const ocrText = ocrResult.extractedText || ocrResult.summary?.extractedText || '';
    const icrText = icrResult.extractedText || icrResult.summary?.recognizedText || '';
    
    const ocrConf = ocrResult.confidence || ocrResult.summary?.confidence || 0;
    const icrConf = icrResult.confidence || icrResult.summary?.confidence || 0;

    if (ocrConf > icrConf * 1.2) {
      combined.text = ocrText;
      combined.confidence = ocrConf;
      combined.primarySource = 'ocr';
    } else if (icrConf > ocrConf * 1.2) {
      combined.text = icrText;
      combined.confidence = icrConf;
      combined.primarySource = 'icr';
    } else {
      // Merge both results
      combined.text = this._mergeText(ocrText, icrText);
      combined.confidence = (ocrConf + icrConf) / 2;
      combined.primarySource = 'merged';
    }

    return combined;
  }

  /**
   * Merge text from multiple sources
   */
  _mergeText(text1, text2) {
    if (!text1) return text2;
    if (!text2) return text1;
    
    // Simple merge - in practice, you might want more sophisticated logic
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');
    
    const merged = [];
    const maxLines = Math.max(lines1.length, lines2.length);
    
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';
      
      if (line1.length > line2.length) {
        merged.push(line1);
      } else {
        merged.push(line2);
      }
    }
    
    return merged.join('\n');
  }

  /**
   * Extract final text from processing results
   */
  _extractFinalText(results) {
    if (results.combined) {
      return results.combined.text || '';
    }
    
    if (results.ocr) {
      return results.ocr.extractedText || results.ocr.summary?.extractedText || '';
    }
    
    if (results.icr) {
      return results.icr.extractedText || results.icr.summary?.recognizedText || '';
    }
    
    return '';
  }

  /**
   * Calculate final confidence from processing results
   */
  _calculateFinalConfidence(results) {
    if (results.combined) {
      return results.combined.confidence || 0;
    }
    
    if (results.ocr) {
      return results.ocr.confidence || results.ocr.summary?.confidence || 0;
    }
    
    if (results.icr) {
      return results.icr.confidence || results.icr.summary?.confidence || 0;
    }
    
    return 0;
  }
}

module.exports = EnhancedICRService;