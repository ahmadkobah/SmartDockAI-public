/**
 * Model Registry Controller
 * 
 * Provides REST API endpoints for model registry management
 * including model upload, deployment, monitoring, and analytics.
 */

const ModelRegistryIntegration = require('../services/ModelRegistryIntegration');
const { logger } = require('../utils');
const multer = require('multer');
const path = require('path');

class ModelRegistryController {
    constructor() {
        this.modelRegistry = new ModelRegistryIntegration();
        this.setupMulter();
    }
    
    setupMulter() {
        // Configure multer for file uploads
        this.upload = multer({
            storage: multer.memoryStorage(),
            limits: {
                fileSize: 100 * 1024 * 1024 // 100MB limit
            },
            fileFilter: (req, file, cb) => {
                // Allow various model file formats
                const allowedExtensions = ['.pkl', '.joblib', '.h5', '.pb', '.onnx', '.pt', '.pth', '.json', '.zip'];
                const ext = path.extname(file.originalname).toLowerCase();
                
                if (allowedExtensions.includes(ext)) {
                    cb(null, true);
                } else {
                    cb(new Error(`Unsupported file type: ${ext}`), false);
                }
            }
        });
    }
    
    /**
     * GET /api/models/registry/health
     * Check Model Registry service health
     */
    async getHealth(req, res) {
        try {
            const health = await this.modelRegistry.healthCheck();
            
            if (health.success) {
                res.status(200).json({
                    success: true,
                    data: health,
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(503).json({
                    success: false,
                    error: 'Model Registry service is unhealthy',
                    details: health,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            logger.error('Model Registry health check failed', error);
            res.status(500).json({
                success: false,
                error: 'Health check failed',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    /**
     * GET /api/models/registry/info
     * Get Model Registry service information
     */
    async getServiceInfo(req, res) {
        try {
            const info = await this.modelRegistry.getServiceInfo();
            
            res.status(200).json({
                success: true,
                data: info.data,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to get Model Registry info', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get service info',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    /**
     * GET /api/models/registry/models
     * List all models with optional filtering
     */
    async listModels(req, res) {
        try {
            const options = {
                modelType: req.query.model_type,
                taskType: req.query.task_type,
                status: req.query.status,
                limit: parseInt(req.query.limit) || 100,
                offset: parseInt(req.query.offset) || 0
            };
            
            const result = await this.modelRegistry.listModels(options);
            
            res.status(200).json({
                success: true,
                data: result.models,
                total: result.total,
                filters: options,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to list models', error);
            res.status(500).json({
                success: false,
                error: 'Failed to list models',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    /**
     * GET /api/models/registry/models/:modelId
     * Get detailed information about a specific model
     */
    async getModel(req, res) {
        try {
            const { modelId } = req.params;
            
            if (!modelId) {
                return res.status(400).json({
                    success: false,
                    error: 'Model ID is required',
                    timestamp: new Date().toISOString()
                });
            }
            
            const result = await this.modelRegistry.getModel(modelId);
            
            res.status(200).json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to get model', { modelId: req.params.modelId, error });
            
            if (error.message.includes('not found')) {
                res.status(404).json({
                    success: false,
                    error: 'Model not found',
                    message: error.message,
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to get model',
                    message: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }
    
    /**
     * POST /api/models/registry/models/upload
     * Upload a new model to the registry
     */
    async uploadModel(req, res) {
        try {
            // Validate required fields
            const requiredFields = ['name', 'model_type', 'task_type', 'framework', 'version'];
            const missingFields = requiredFields.filter(field => !req.body[field]);
            
            if (missingFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    missingFields,
                    timestamp: new Date().toISOString()
                });
            }
            
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Model file is required',
                    timestamp: new Date().toISOString()
                });
            }
            
            const modelInfo = {
                name: req.body.name,
                model_type: req.body.model_type,
                task_type: req.body.task_type,
                framework: req.body.framework,
                version: req.body.version,
                description: req.body.description,
                tags: req.body.tags,
                metrics: req.body.metrics ? JSON.parse(req.body.metrics) : {},
                config: req.body.config ? JSON.parse(req.body.config) : {}
            };
            
            const result = await this.modelRegistry.uploadModel(modelInfo, req.file);
            
            res.status(201).json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Model upload failed', error);
            res.status(500).json({
                success: false,
                error: 'Model upload failed',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    /**
     * POST /api/models/registry/models/:modelId/deploy
     * Deploy a model to a service
     */
    async deployModel(req, res) {
        try {
            const { modelId } = req.params;
            const { service_name: serviceName, environment, config } = req.body;
            
            if (!modelId || !serviceName) {
                return res.status(400).json({
                    success: false,
                    error: 'Model ID and service name are required',
                    timestamp: new Date().toISOString()
                });
            }
            
            const deploymentConfig = {
                service_name: serviceName,
                environment: environment || 'production',
                config: config || {}
            };
            
            const result = await this.modelRegistry.deployModel(modelId, deploymentConfig);
            
            res.status(200).json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Model deployment failed', { 
                modelId: req.params.modelId, 
                error 
            });
            res.status(500).json({
                success: false,
                error: 'Model deployment failed',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    /**
     * GET /api/models/registry/services/:serviceName/models
     * Get deployed models for a service
     */
    async getDeployedModels(req, res) {
        try {
            const { serviceName } = req.params;
            const environment = req.query.environment || 'production';
            
            if (!serviceName) {
                return res.status(400).json({
                    success: false,
                    error: 'Service name is required',
                    timestamp: new Date().toISOString()
                });
            }
            
            const result = await this.modelRegistry.getDeployedModels(serviceName, environment);
            
            res.status(200).json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to get deployed models', { 
                serviceName: req.params.serviceName, 
                error 
            });
            res.status(500).json({
                success: false,
                error: 'Failed to get deployed models',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    /**
     * POST /api/models/registry/metrics
     * Record performance metrics for a model
     */
    async recordMetrics(req, res) {
        try {
            const { model_id: modelId, latency, accuracy, confidence, memory_usage: memoryUsage, custom_metrics: customMetrics } = req.body;
            
            if (!modelId) {
                return res.status(400).json({
                    success: false,
                    error: 'Model ID is required',
                    timestamp: new Date().toISOString()
                });
            }
            
            const metrics = {
                latency,
                accuracy,
                confidence,
                memoryUsage,
                customMetrics
            };
            
            const result = await this.modelRegistry.recordMetrics(modelId, metrics);
            
            res.status(200).json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to record metrics', error);
            res.status(500).json({
                success: false,
                error: 'Failed to record metrics',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    /**
     * DELETE /api/models/registry/models/:modelId
     * Delete a model from the registry
     */
    async deleteModel(req, res) {
        try {
            const { modelId } = req.params;
            
            if (!modelId) {
                return res.status(400).json({
                    success: false,
                    error: 'Model ID is required',
                    timestamp: new Date().toISOString()
                });
            }
            
            const result = await this.modelRegistry.deleteModel(modelId);
            
            res.status(200).json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to delete model', { 
                modelId: req.params.modelId, 
                error 
            });
            
            if (error.message.includes('not found')) {
                res.status(404).json({
                    success: false,
                    error: 'Model not found',
                    message: error.message,
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to delete model',
                    message: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }
    
    /**
     * GET /api/models/registry/models/:modelId/analytics
     * Get model performance analytics
     */
    async getModelAnalytics(req, res) {
        try {
            const { modelId } = req.params;
            const timeRange = req.query.time_range || '7d';
            
            if (!modelId) {
                return res.status(400).json({
                    success: false,
                    error: 'Model ID is required',
                    timestamp: new Date().toISOString()
                });
            }
            
            const result = await this.modelRegistry.getModelAnalytics(modelId, timeRange);
            
            res.status(200).json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to get model analytics', { 
                modelId: req.params.modelId, 
                error 
            });
            res.status(500).json({
                success: false,
                error: 'Failed to get model analytics',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    /**
     * POST /api/models/registry/models/compare
     * Compare performance of multiple models
     */
    async compareModels(req, res) {
        try {
            const { model_ids: modelIds } = req.body;
            
            if (!modelIds || !Array.isArray(modelIds) || modelIds.length < 2) {
                return res.status(400).json({
                    success: false,
                    error: 'At least 2 model IDs are required for comparison',
                    timestamp: new Date().toISOString()
                });
            }
            
            const result = await this.modelRegistry.compareModels(modelIds);
            
            res.status(200).json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to compare models', error);
            res.status(500).json({
                success: false,
                error: 'Failed to compare models',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    /**
     * GET /api/models/registry/recommendations
     * Get model recommendations for deployment
     */
    async getModelRecommendations(req, res) {
        try {
            const { task_type: taskType, model_type: modelType } = req.query;
            
            if (!taskType) {
                return res.status(400).json({
                    success: false,
                    error: 'Task type is required',
                    timestamp: new Date().toISOString()
                });
            }
            
            const result = await this.modelRegistry.suggestBestModel(taskType, modelType);
            
            res.status(200).json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to get model recommendations', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get model recommendations',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

// Export multer middleware and controller
const controller = new ModelRegistryController();

module.exports = {
    ModelRegistryController,
    controller,
    uploadMiddleware: controller.upload.single('model_file')
};