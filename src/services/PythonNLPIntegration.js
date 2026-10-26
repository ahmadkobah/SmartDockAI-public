/**
 * Python NLP Integration Service
 * 
 * Provides integration between Node.js backend and Python NLP service
 * for comprehensive text analysis capabilities.
 */

const axios = require('axios');
const { logger } = require('../utils');

class PythonNLPIntegration {
    constructor(config = {}) {
        this.baseURL = config.baseURL || process.env.NLP_SERVICE_URL || 'http://localhost:8002';
        this.timeout = config.timeout || 30000;
        this.retries = config.retries || 3;
        this.retryDelay = config.retryDelay || 1000;
        
        // Create axios instance with default config
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        // Add request/response interceptors
        this.setupInterceptors();
        
        logger.info('PythonNLPIntegration initialized', { 
            baseURL: this.baseURL,
            timeout: this.timeout 
        });
    }
    
    setupInterceptors() {
        // Request interceptor
        this.client.interceptors.request.use(
            (config) => {
                logger.debug('NLP Service Request', {
                    method: config.method,
                    url: config.url,
                    data: config.data ? JSON.stringify(config.data).substring(0, 200) : null
                });
                return config;
            },
            (error) => {
                logger.error('NLP Service Request Error', error);
                return Promise.reject(error);
            }
        );
        
        // Response interceptor
        this.client.interceptors.response.use(
            (response) => {
                logger.debug('NLP Service Response', {
                    status: response.status,
                    url: response.config.url,
                    processingTime: response.data?.processing_time
                });
                return response;
            },
            (error) => {
                logger.error('NLP Service Response Error', {
                    status: error.response?.status,
                    message: error.message,
                    url: error.config?.url
                });
                return Promise.reject(error);
            }
        );
    }
    
    /**
     * Check if NLP service is healthy and ready
     */
    async healthCheck() {
        try {
            const response = await this.client.get('/health');
            return {
                success: true,
                status: response.data.status,
                services: response.data.services,
                timestamp: response.data.timestamp
            };
        } catch (error) {
            logger.error('NLP Service health check failed', error);
            return {
                success: false,
                error: error.message,
                status: 'unhealthy'
            };
        }
    }
    
    /**
     * Get service information and capabilities
     */
    async getServiceInfo() {
        try {
            const response = await this.client.get('/');
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            logger.error('Failed to get NLP service info', error);
            throw new Error(`NLP service info failed: ${error.message}`);
        }
    }
    
    /**
     * Analyze sentiment of text
     */
    async analyzeSentiment(text, options = {}) {
        try {
            const payload = {
                text: text,
                language: options.language || 'auto',
                include_details: options.includeDetails !== false
            };
            
            const response = await this.client.post('/analyze/sentiment', payload);
            
            return {
                success: true,
                sentiment: response.data.sentiment,
                language: response.data.language,
                processingTime: response.data.processing_time,
                timestamp: response.data.timestamp
            };
        } catch (error) {
            logger.error('Sentiment analysis failed', { text: text.substring(0, 100), error: error.message });
            throw new Error(`Sentiment analysis failed: ${error.message}`);
        }
    }
    
    /**
     * Extract named entities from text
     */
    async extractEntities(text, options = {}) {
        try {
            const payload = {
                text: text,
                language: options.language || 'auto',
                entity_types: options.entityTypes || null
            };
            
            const response = await this.client.post('/analyze/entities', payload);
            
            return {
                success: true,
                entities: response.data.entities,
                totalEntities: response.data.total_entities,
                language: response.data.language,
                processingTime: response.data.processing_time,
                timestamp: response.data.timestamp
            };
        } catch (error) {
            logger.error('Entity extraction failed', { text: text.substring(0, 100), error: error.message });
            throw new Error(`Entity extraction failed: ${error.message}`);
        }
    }
    
    /**
     * Extract keywords from text
     */
    async extractKeywords(text, options = {}) {
        try {
            const payload = {
                text: text,
                language: options.language || 'auto',
                max_keywords: options.maxKeywords || 10,
                min_score: options.minScore || 0.1
            };
            
            const response = await this.client.post('/analyze/keywords', payload);
            
            return {
                success: true,
                keywords: response.data.keywords,
                totalKeywords: response.data.total_keywords,
                language: response.data.language,
                processingTime: response.data.processing_time,
                timestamp: response.data.timestamp
            };
        } catch (error) {
            logger.error('Keyword extraction failed', { text: text.substring(0, 100), error: error.message });
            throw new Error(`Keyword extraction failed: ${error.message}`);
        }
    }
    
    /**
     * Summarize text content
     */
    async summarizeText(text, options = {}) {
        try {
            const payload = {
                text: text,
                language: options.language || 'auto',
                max_length: options.maxLength || 150,
                min_length: options.minLength || 50
            };
            
            const response = await this.client.post('/analyze/summarize', payload);
            
            return {
                success: true,
                summary: response.data.summary,
                originalText: response.data.original_text,
                language: response.data.language,
                processingTime: response.data.processing_time,
                timestamp: response.data.timestamp
            };
        } catch (error) {
            logger.error('Text summarization failed', { text: text.substring(0, 100), error: error.message });
            throw new Error(`Text summarization failed: ${error.message}`);
        }
    }
    
    /**
     * Detect language of text
     */
    async detectLanguage(text) {
        try {
            const payload = { text: text };
            
            const response = await this.client.post('/analyze/language', payload);
            
            return {
                success: true,
                language: response.data.language,
                processingTime: response.data.processing_time,
                timestamp: response.data.timestamp
            };
        } catch (error) {
            logger.error('Language detection failed', { text: text.substring(0, 100), error: error.message });
            throw new Error(`Language detection failed: ${error.message}`);
        }
    }
    
    /**
     * Classify text into categories
     */
    async classifyText(text, options = {}) {
        try {
            const payload = {
                text: text,
                language: options.language || 'auto',
                categories: options.categories || null
            };
            
            const response = await this.client.post('/analyze/classify', payload);
            
            return {
                success: true,
                classification: response.data.classification,
                language: response.data.language,
                processingTime: response.data.processing_time,
                timestamp: response.data.timestamp
            };
        } catch (error) {
            logger.error('Text classification failed', { text: text.substring(0, 100), error: error.message });
            throw new Error(`Text classification failed: ${error.message}`);
        }
    }
    
    /**
     * Calculate semantic similarity between two texts
     */
    async calculateSimilarity(text1, text2, options = {}) {
        try {
            const payload = {
                text1: text1,
                text2: text2,
                language: options.language || 'auto'
            };
            
            const response = await this.client.post('/analyze/similarity', payload);
            
            return {
                success: true,
                similarity: response.data.similarity,
                text1: response.data.text1,
                text2: response.data.text2,
                language: response.data.language,
                processingTime: response.data.processing_time,
                timestamp: response.data.timestamp
            };
        } catch (error) {
            logger.error('Similarity calculation failed', { 
                text1: text1.substring(0, 50), 
                text2: text2.substring(0, 50), 
                error: error.message 
            });
            throw new Error(`Similarity calculation failed: ${error.message}`);
        }
    }
    
    /**
     * Process multiple texts with batch processing
     */
    async batchAnalyze(texts, task, options = {}) {
        try {
            const payload = {
                texts: texts,
                task: task,
                language: options.language || 'auto',
                parameters: options.parameters || {}
            };
            
            const response = await this.client.post('/analyze/batch', payload);
            
            return {
                success: true,
                results: response.data.results,
                totalProcessed: response.data.total_processed,
                task: response.data.task,
                language: response.data.language,
                timestamp: response.data.timestamp
            };
        } catch (error) {
            logger.error('Batch analysis failed', { 
                textsCount: texts.length, 
                task: task, 
                error: error.message 
            });
            throw new Error(`Batch analysis failed: ${error.message}`);
        }
    }
    
    /**
     * Comprehensive document analysis (combines multiple NLP tasks)
     */
    async analyzeDocument(text, options = {}) {
        try {
            const results = {};
            const language = options.language || 'auto';
            
            // Run all analyses in parallel for better performance
            const analyses = await Promise.allSettled([
                this.detectLanguage(text),
                this.analyzeSentiment(text, { language }),
                this.extractEntities(text, { language, entityTypes: options.entityTypes }),
                this.extractKeywords(text, { 
                    language, 
                    maxKeywords: options.maxKeywords || 10,
                    minScore: options.minScore || 0.2 
                }),
                this.classifyText(text, { language, categories: options.categories })
            ]);
            
            // Process results
            if (analyses[0].status === 'fulfilled') {
                results.language = analyses[0].value.language;
            }
            
            if (analyses[1].status === 'fulfilled') {
                results.sentiment = analyses[1].value.sentiment;
            }
            
            if (analyses[2].status === 'fulfilled') {
                results.entities = analyses[2].value.entities;
            }
            
            if (analyses[3].status === 'fulfilled') {
                results.keywords = analyses[3].value.keywords;
            }
            
            if (analyses[4].status === 'fulfilled') {
                results.classification = analyses[4].value.classification;
            }
            
            // Add summary if text is long enough
            if (text.length > 500 && options.includeSummary !== false) {
                try {
                    const summaryResult = await this.summarizeText(text, { 
                        language: results.language?.detected || language 
                    });
                    results.summary = summaryResult.summary;
                } catch (error) {
                    logger.warn('Summary generation failed during document analysis', error);
                }
            }
            
            return {
                success: true,
                analysis: results,
                originalTextLength: text.length,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            logger.error('Document analysis failed', { 
                textLength: text.length, 
                error: error.message 
            });
            throw new Error(`Document analysis failed: ${error.message}`);
        }
    }
    
    /**
     * Get model information
     */
    async getModelInfo() {
        try {
            const response = await this.client.get('/models/info');
            return {
                success: true,
                modelInfo: response.data.model_info,
                config: response.data.config,
                timestamp: response.data.timestamp
            };
        } catch (error) {
            logger.error('Failed to get model info', error);
            throw new Error(`Get model info failed: ${error.message}`);
        }
    }
    
    /**
     * Retry mechanism for failed requests
     */
    async withRetry(operation, ...args) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.retries; attempt++) {
            try {
                return await operation(...args);
            } catch (error) {
                lastError = error;
                
                if (attempt === this.retries) {
                    break;
                }
                
                logger.warn(`NLP operation failed, retrying (${attempt}/${this.retries})`, {
                    error: error.message,
                    retryDelay: this.retryDelay
                });
                
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
            }
        }
        
        throw lastError;
    }
}

module.exports = PythonNLPIntegration;