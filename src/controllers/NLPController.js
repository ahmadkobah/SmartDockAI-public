/**
 * NLP Controller
 * 
 * Handles HTTP requests for Natural Language Processing operations
 * and integrates with the Python NLP service.
 */

const PythonNLPIntegration = require('../services/PythonNLPIntegration');
const { logger } = require('../utils');

class NLPController {
    constructor() {
        this.nlpService = new PythonNLPIntegration();
    }
    
    /**
     * Health check for NLP service
     */
    async healthCheck(req, res) {
        try {
            const health = await this.nlpService.healthCheck();
            
            if (health.success) {
                res.status(200).json({
                    success: true,
                    service: 'nlp',
                    status: health.status,
                    services: health.services,
                    timestamp: health.timestamp
                });
            } else {
                res.status(503).json({
                    success: false,
                    service: 'nlp',
                    status: 'unhealthy',
                    error: health.error
                });
            }
        } catch (error) {
            logger.error('NLP health check failed', error);
            res.status(500).json({
                success: false,
                message: 'NLP health check failed',
                error: error.message
            });
        }
    }
    
    /**
     * Get NLP service information
     */
    async getServiceInfo(req, res) {
        try {
            const info = await this.nlpService.getServiceInfo();
            
            res.status(200).json({
                success: true,
                data: info.data
            });
        } catch (error) {
            logger.error('Failed to get NLP service info', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get NLP service information',
                error: error.message
            });
        }
    }
    
    /**
     * Analyze document sentiment
     */
    async analyzeSentiment(req, res) {
        try {
            const { text, language, includeDetails } = req.body;
            
            if (!text || typeof text !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Text is required and must be a string'
                });
            }
            
            const result = await this.nlpService.analyzeSentiment(text, {
                language,
                includeDetails
            });
            
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Sentiment analysis failed', error);
            res.status(500).json({
                success: false,
                message: 'Sentiment analysis failed',
                error: error.message
            });
        }
    }
    
    /**
     * Extract named entities
     */
    async extractEntities(req, res) {
        try {
            const { text, language, entityTypes } = req.body;
            
            if (!text || typeof text !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Text is required and must be a string'
                });
            }
            
            const result = await this.nlpService.extractEntities(text, {
                language,
                entityTypes
            });
            
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Entity extraction failed', error);
            res.status(500).json({
                success: false,
                message: 'Entity extraction failed',
                error: error.message
            });
        }
    }
    
    /**
     * Extract keywords
     */
    async extractKeywords(req, res) {
        try {
            const { text, language, maxKeywords, minScore } = req.body;
            
            if (!text || typeof text !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Text is required and must be a string'
                });
            }
            
            const result = await this.nlpService.extractKeywords(text, {
                language,
                maxKeywords,
                minScore
            });
            
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Keyword extraction failed', error);
            res.status(500).json({
                success: false,
                message: 'Keyword extraction failed',
                error: error.message
            });
        }
    }
    
    /**
     * Summarize text
     */
    async summarizeText(req, res) {
        try {
            const { text, language, maxLength, minLength } = req.body;
            
            if (!text || typeof text !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Text is required and must be a string'
                });
            }
            
            const result = await this.nlpService.summarizeText(text, {
                language,
                maxLength,
                minLength
            });
            
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Text summarization failed', error);
            res.status(500).json({
                success: false,
                message: 'Text summarization failed',
                error: error.message
            });
        }
    }
    
    /**
     * Detect text language
     */
    async detectLanguage(req, res) {
        try {
            const { text } = req.body;
            
            if (!text || typeof text !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Text is required and must be a string'
                });
            }
            
            const result = await this.nlpService.detectLanguage(text);
            
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Language detection failed', error);
            res.status(500).json({
                success: false,
                message: 'Language detection failed',
                error: error.message
            });
        }
    }
    
    /**
     * Classify text
     */
    async classifyText(req, res) {
        try {
            const { text, language, categories } = req.body;
            
            if (!text || typeof text !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Text is required and must be a string'
                });
            }
            
            const result = await this.nlpService.classifyText(text, {
                language,
                categories
            });
            
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Text classification failed', error);
            res.status(500).json({
                success: false,
                message: 'Text classification failed',
                error: error.message
            });
        }
    }
    
    /**
     * Calculate semantic similarity
     */
    async calculateSimilarity(req, res) {
        try {
            const { text1, text2, language } = req.body;
            
            if (!text1 || !text2 || typeof text1 !== 'string' || typeof text2 !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Both text1 and text2 are required and must be strings'
                });
            }
            
            const result = await this.nlpService.calculateSimilarity(text1, text2, {
                language
            });
            
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Similarity calculation failed', error);
            res.status(500).json({
                success: false,
                message: 'Similarity calculation failed',
                error: error.message
            });
        }
    }
    
    /**
     * Batch analyze multiple texts
     */
    async batchAnalyze(req, res) {
        try {
            const { texts, task, language, parameters } = req.body;
            
            if (!texts || !Array.isArray(texts) || texts.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Texts array is required and must not be empty'
                });
            }
            
            if (!task || typeof task !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Task is required and must be a string'
                });
            }
            
            const validTasks = ['sentiment', 'entities', 'keywords', 'language', 'classify'];
            if (!validTasks.includes(task)) {
                return res.status(400).json({
                    success: false,
                    message: `Task must be one of: ${validTasks.join(', ')}`
                });
            }
            
            const result = await this.nlpService.batchAnalyze(texts, task, {
                language,
                parameters
            });
            
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Batch analysis failed', error);
            res.status(500).json({
                success: false,
                message: 'Batch analysis failed',
                error: error.message
            });
        }
    }
    
    /**
     * Comprehensive document analysis
     */
    async analyzeDocument(req, res) {
        try {
            const { 
                text, 
                language, 
                entityTypes, 
                maxKeywords, 
                minScore, 
                categories,
                includeSummary 
            } = req.body;
            
            if (!text || typeof text !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Text is required and must be a string'
                });
            }
            
            const result = await this.nlpService.analyzeDocument(text, {
                language,
                entityTypes,
                maxKeywords,
                minScore,
                categories,
                includeSummary
            });
            
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Document analysis failed', error);
            res.status(500).json({
                success: false,
                message: 'Document analysis failed',
                error: error.message
            });
        }
    }
    
    /**
     * Get model information
     */
    async getModelInfo(req, res) {
        try {
            const result = await this.nlpService.getModelInfo();
            
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Failed to get model info', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get model information',
                error: error.message
            });
        }
    }
    
    /**
     * Process document content with NLP analysis
     * (Integration endpoint for document processing pipeline)
     */
    async processDocumentContent(req, res) {
        try {
            const { documentId, extractedText, metadata } = req.body;
            
            if (!documentId || !extractedText) {
                return res.status(400).json({
                    success: false,
                    message: 'Document ID and extracted text are required'
                });
            }
            
            // Perform comprehensive NLP analysis
            const analysisResult = await this.nlpService.analyzeDocument(extractedText, {
                language: metadata?.language || 'auto',
                includeSummary: true,
                maxKeywords: 15,
                minScore: 0.3
            });
            
            // Structure the result for document processing pipeline
            const processedData = {
                documentId,
                nlpAnalysis: analysisResult.analysis,
                metadata: {
                    ...metadata,
                    nlpProcessedAt: new Date().toISOString(),
                    textLength: extractedText.length,
                    processingTime: analysisResult.analysis.processingTime
                }
            };
            
            res.status(200).json({
                success: true,
                data: processedData
            });
            
        } catch (error) {
            logger.error('Document content processing failed', error);
            res.status(500).json({
                success: false,
                message: 'Document content processing failed',
                error: error.message
            });
        }
    }
}

module.exports = new NLPController();