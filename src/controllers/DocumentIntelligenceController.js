/**
 * Document Intelligence Controller
 * 
 * Handles communication with the Python Document Intelligence microservice.
 * Provides endpoints for advanced document understanding, classification,
 * entity extraction, template matching, and intelligent routing.
 */

const axios = require('axios');
const FormData = require('form-data');
const { logger } = require('../utils/logger');

class DocumentIntelligenceController {
    constructor() {
        this.intelligenceServiceUrl = process.env.PYTHON_INTELLIGENCE_URL || 'http://localhost:8004';
        this.timeout = 60000; // 60 seconds timeout for analysis
    }

    /**
     * Comprehensive document intelligence analysis
     */
    async analyzeDocument(req, res) {
        try {
            const { content, filename, metadata, analysisType = 'full' } = req.body;

            if (!content) {
                return res.status(400).json({
                    success: false,
                    message: 'Document content is required'
                });
            }

            const requestData = {
                content,
                filename,
                metadata: {
                    ...metadata,
                    user_id: req.user?.id,
                    request_timestamp: new Date().toISOString()
                }
            };

            const response = await axios.post(
                `${this.intelligenceServiceUrl}/intelligence/analyze`,
                requestData,
                { timeout: this.timeout }
            );

            logger.info(`Document intelligence analysis completed for ${filename || 'unknown'}`);

            res.json({
                success: true,
                message: 'Document analysis completed successfully',
                data: response.data
            });

        } catch (error) {
            logger.error('Document intelligence analysis error:', error.message);
            
            if (error.response) {
                return res.status(error.response.status).json({
                    success: false,
                    message: 'Document intelligence service error',
                    error: error.response.data
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to analyze document',
                error: error.message
            });
        }
    }

    /**
     * Upload and analyze file
     */
    async analyzeUploadedFile(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const { analysisType = 'full', confidenceThreshold = 0.8 } = req.body;

            // Create form data for file upload
            const formData = new FormData();
            formData.append('file', req.file.buffer, {
                filename: req.file.originalname,
                contentType: req.file.mimetype
            });
            formData.append('analysis_type', analysisType);
            formData.append('confidence_threshold', confidenceThreshold);

            const response = await axios.post(
                `${this.intelligenceServiceUrl}/upload/analyze`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'Content-Length': formData.getLengthSync()
                    },
                    timeout: this.timeout,
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity
                }
            );

            logger.info(`File analysis completed for ${req.file.originalname}`);

            res.json({
                success: true,
                message: 'File analysis completed successfully',
                data: response.data
            });

        } catch (error) {
            logger.error('File analysis error:', error.message);
            
            if (error.response) {
                return res.status(error.response.status).json({
                    success: false,
                    message: 'Document intelligence service error',
                    error: error.response.data
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to analyze uploaded file',
                error: error.message
            });
        }
    }

    /**
     * Document classification only
     */
    async classifyDocument(req, res) {
        try {
            const { content, filename, metadata, confidenceThreshold = 0.8, returnAllPredictions = false } = req.body;

            if (!content) {
                return res.status(400).json({
                    success: false,
                    message: 'Document content is required'
                });
            }

            const requestData = {
                document: {
                    content,
                    filename,
                    metadata: {
                        ...metadata,
                        user_id: req.user?.id,
                        request_timestamp: new Date().toISOString()
                    }
                },
                confidence_threshold: confidenceThreshold,
                return_all_predictions: returnAllPredictions
            };

            const response = await axios.post(
                `${this.intelligenceServiceUrl}/classification/classify`,
                requestData,
                { timeout: this.timeout }
            );

            res.json({
                success: true,
                message: 'Document classification completed successfully',
                data: response.data
            });

        } catch (error) {
            logger.error('Document classification error:', error.message);
            
            if (error.response) {
                return res.status(error.response.status).json({
                    success: false,
                    message: 'Classification service error',
                    error: error.response.data
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to classify document',
                error: error.message
            });
        }
    }

    /**
     * Entity extraction from document
     */
    async extractEntities(req, res) {
        try {
            const { content, filename, metadata, extractionTypes, customPatterns } = req.body;

            if (!content) {
                return res.status(400).json({
                    success: false,
                    message: 'Document content is required'
                });
            }

            const requestData = {
                document: {
                    content,
                    filename,
                    metadata: {
                        ...metadata,
                        user_id: req.user?.id,
                        request_timestamp: new Date().toISOString()
                    }
                },
                extraction_types: extractionTypes,
                custom_patterns: customPatterns
            };

            const response = await axios.post(
                `${this.intelligenceServiceUrl}/extraction/extract`,
                requestData,
                { timeout: this.timeout }
            );

            res.json({
                success: true,
                message: 'Entity extraction completed successfully',
                data: response.data
            });

        } catch (error) {
            logger.error('Entity extraction error:', error.message);
            
            if (error.response) {
                return res.status(error.response.status).json({
                    success: false,
                    message: 'Extraction service error',
                    error: error.response.data
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to extract entities',
                error: error.message
            });
        }
    }

    /**
     * Template matching
     */
    async matchTemplates(req, res) {
        try {
            const { content, filename, metadata, templateIds, similarityThreshold = 0.85 } = req.body;

            if (!content) {
                return res.status(400).json({
                    success: false,
                    message: 'Document content is required'
                });
            }

            const requestData = {
                document: {
                    content,
                    filename,
                    metadata: {
                        ...metadata,
                        user_id: req.user?.id,
                        request_timestamp: new Date().toISOString()
                    }
                },
                template_ids: templateIds,
                similarity_threshold: similarityThreshold
            };

            const response = await axios.post(
                `${this.intelligenceServiceUrl}/templates/match`,
                requestData,
                { timeout: this.timeout }
            );

            res.json({
                success: true,
                message: 'Template matching completed successfully',
                data: response.data
            });

        } catch (error) {
            logger.error('Template matching error:', error.message);
            
            if (error.response) {
                return res.status(error.response.status).json({
                    success: false,
                    message: 'Template matching service error',
                    error: error.response.data
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to match templates',
                error: error.message
            });
        }
    }

    /**
     * Document validation
     */
    async validateDocument(req, res) {
        try {
            const { content, filename, metadata, documentType, validationRules } = req.body;

            if (!content) {
                return res.status(400).json({
                    success: false,
                    message: 'Document content is required'
                });
            }

            const requestData = {
                document: {
                    content,
                    filename,
                    metadata: {
                        ...metadata,
                        user_id: req.user?.id,
                        request_timestamp: new Date().toISOString()
                    }
                },
                document_type: documentType,
                validation_rules: validationRules
            };

            const response = await axios.post(
                `${this.intelligenceServiceUrl}/validation/validate`,
                requestData,
                { timeout: this.timeout }
            );

            res.json({
                success: true,
                message: 'Document validation completed successfully',
                data: response.data
            });

        } catch (error) {
            logger.error('Document validation error:', error.message);
            
            if (error.response) {
                return res.status(error.response.status).json({
                    success: false,
                    message: 'Validation service error',
                    error: error.response.data
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to validate document',
                error: error.message
            });
        }
    }

    /**
     * Document routing recommendations
     */
    async routeDocument(req, res) {
        try {
            const { content, filename, metadata, classificationResult, routingCriteria } = req.body;

            if (!content) {
                return res.status(400).json({
                    success: false,
                    message: 'Document content is required'
                });
            }

            const requestData = {
                document: {
                    content,
                    filename,
                    metadata: {
                        ...metadata,
                        user_id: req.user?.id,
                        request_timestamp: new Date().toISOString()
                    }
                },
                classification_result: classificationResult,
                routing_criteria: routingCriteria
            };

            const response = await axios.post(
                `${this.intelligenceServiceUrl}/routing/route`,
                requestData,
                { timeout: this.timeout }
            );

            res.json({
                success: true,
                message: 'Document routing completed successfully',
                data: response.data
            });

        } catch (error) {
            logger.error('Document routing error:', error.message);
            
            if (error.response) {
                return res.status(error.response.status).json({
                    success: false,
                    message: 'Routing service error',
                    error: error.response.data
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to route document',
                error: error.message
            });
        }
    }

    /**
     * Get service health status
     */
    async getHealthStatus(req, res) {
        try {
            const response = await axios.get(
                `${this.intelligenceServiceUrl}/health`,
                { timeout: 5000 }
            );

            res.json({
                success: true,
                message: 'Document Intelligence service is healthy',
                data: response.data
            });

        } catch (error) {
            logger.error('Document Intelligence health check failed:', error.message);
            
            res.status(503).json({
                success: false,
                message: 'Document Intelligence service is unavailable',
                error: error.message
            });
        }
    }

    /**
     * Get service analytics
     */
    async getAnalytics(req, res) {
        try {
            const response = await axios.get(
                `${this.intelligenceServiceUrl}/analytics/stats`,
                { timeout: 10000 }
            );

            res.json({
                success: true,
                message: 'Analytics retrieved successfully',
                data: response.data
            });

        } catch (error) {
            logger.error('Analytics retrieval error:', error.message);
            
            if (error.response) {
                return res.status(error.response.status).json({
                    success: false,
                    message: 'Analytics service error',
                    error: error.response.data
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to retrieve analytics',
                error: error.message
            });
        }
    }
}

module.exports = new DocumentIntelligenceController();