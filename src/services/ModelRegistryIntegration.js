/**
 * Model Registry Integration Service
 * 
 * Provides integration between Node.js backend and Model Registry service
 * for model management, deployment, and performance tracking.
 */

const axios = require('axios');
const { logger } = require('../utils');

class ModelRegistryIntegration {
    constructor(config = {}) {
        this.baseURL = config.baseURL || process.env.MODEL_REGISTRY_URL || 'http://localhost:8003';
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
        
        logger.info('ModelRegistryIntegration initialized', { 
            baseURL: this.baseURL,
            timeout: this.timeout 
        });
    }
    
    setupInterceptors() {
        // Request interceptor
        this.client.interceptors.request.use(
            (config) => {
                logger.debug('Model Registry Request', {
                    method: config.method,
                    url: config.url,
                    data: config.data ? JSON.stringify(config.data).substring(0, 200) : null
                });
                return config;
            },
            (error) => {
                logger.error('Model Registry Request Error', error);
                return Promise.reject(error);
            }
        );
        
        // Response interceptor
        this.client.interceptors.response.use(
            (response) => {
                logger.debug('Model Registry Response', {
                    status: response.status,
                    url: response.config.url
                });
                return response;
            },
            (error) => {
                logger.error('Model Registry Response Error', {
                    status: error.response?.status,
                    message: error.message,
                    url: error.config?.url
                });
                return Promise.reject(error);
            }
        );
    }
    
    /**
     * Check if Model Registry service is healthy
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
            logger.error('Model Registry health check failed', error);
            return {
                success: false,
                error: error.message,
                status: 'unhealthy'
            };
        }
    }
    
    /**
     * Get service information
     */
    async getServiceInfo() {
        try {
            const response = await this.client.get('/');
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            logger.error('Failed to get Model Registry service info', error);
            throw new Error(`Model Registry service info failed: ${error.message}`);
        }
    }
    
    /**
     * List all models with optional filtering
     */
    async listModels(options = {}) {
        try {
            const params = {
                model_type: options.modelType,
                task_type: options.taskType,
                status: options.status,
                limit: options.limit || 100,
                offset: options.offset || 0
            };
            
            // Remove undefined values
            Object.keys(params).forEach(key => 
                params[key] === undefined && delete params[key]
            );
            
            const response = await this.client.get('/models', { params });
            
            return {
                success: true,
                models: response.data,
                total: response.data.length
            };
        } catch (error) {
            logger.error('Failed to list models', error);
            throw new Error(`List models failed: ${error.message}`);
        }
    }
    
    /**
     * Get detailed information about a specific model
     */
    async getModel(modelId) {
        try {
            const response = await this.client.get(`/models/${modelId}`);
            
            return {
                success: true,
                model: response.data.model,
                deployments: response.data.deployments,
                recentMetrics: response.data.recent_metrics
            };
        } catch (error) {
            logger.error('Failed to get model details', { modelId, error: error.message });
            throw new Error(`Get model failed: ${error.message}`);
        }
    }
    
    /**
     * Upload a new model to the registry
     */
    async uploadModel(modelInfo, modelFile) {
        try {
            const FormData = require('form-data');
            const form = new FormData();
            
            // Add model metadata
            Object.keys(modelInfo).forEach(key => {
                form.append(key, modelInfo[key]);
            });
            
            // Add model file
            if (modelFile.buffer) {
                form.append('model_file', modelFile.buffer, {
                    filename: modelFile.originalname,
                    contentType: modelFile.mimetype
                });
            } else {
                form.append('model_file', modelFile);
            }
            
            const response = await this.client.post('/models/upload', form, {
                headers: {
                    ...form.getHeaders(),
                    'Content-Length': form.getLengthSync()
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            
            return {
                success: true,
                modelId: response.data.model_id,
                storagePath: response.data.storage_path,
                checksum: response.data.checksum,
                sizeBytes: response.data.size_bytes,
                message: response.data.message
            };
        } catch (error) {
            logger.error('Model upload failed', { 
                modelName: modelInfo.name, 
                error: error.message 
            });
            throw new Error(`Model upload failed: ${error.message}`);
        }
    }
    
    /**
     * Deploy a model to a service
     */
    async deployModel(modelId, deploymentConfig) {
        try {
            const response = await this.client.post(`/models/${modelId}/deploy`, deploymentConfig);
            
            return {
                success: true,
                deploymentId: response.data.deployment_id,
                status: response.data.status,
                message: response.data.message
            };
        } catch (error) {
            logger.error('Model deployment failed', { 
                modelId, 
                serviceName: deploymentConfig.service_name,
                error: error.message 
            });
            throw new Error(`Model deployment failed: ${error.message}`);
        }
    }
    
    /**
     * Get deployed models for a service
     */
    async getDeployedModels(serviceName, environment = 'production') {
        try {
            const response = await this.client.get(`/services/${serviceName}/models`, {
                params: { environment }
            });
            
            return {
                success: true,
                deployments: response.data,
                serviceName,
                environment
            };
        } catch (error) {
            logger.error('Failed to get deployed models', { 
                serviceName, 
                environment, 
                error: error.message 
            });
            throw new Error(`Get deployed models failed: ${error.message}`);
        }
    }
    
    /**
     * Record performance metrics for a model
     */
    async recordMetrics(modelId, metrics) {
        try {
            const payload = {
                model_id: modelId,
                latency_ms: metrics.latency,
                accuracy: metrics.accuracy,
                confidence: metrics.confidence,
                memory_usage_mb: metrics.memoryUsage,
                custom_metrics: metrics.customMetrics
            };
            
            const response = await this.client.post('/metrics', payload);
            
            return {
                success: true,
                message: response.data.message
            };
        } catch (error) {
            logger.error('Failed to record metrics', { 
                modelId, 
                error: error.message 
            });
            throw new Error(`Record metrics failed: ${error.message}`);
        }
    }
    
    /**
     * Delete a model from the registry
     */
    async deleteModel(modelId) {
        try {
            const response = await this.client.delete(`/models/${modelId}`);
            
            return {
                success: true,
                message: response.data.message
            };
        } catch (error) {
            logger.error('Failed to delete model', { 
                modelId, 
                error: error.message 
            });
            throw new Error(`Delete model failed: ${error.message}`);
        }
    }
    
    /**
     * Get model performance analytics
     */
    async getModelAnalytics(modelId, timeRange = '7d') {
        try {
            // This would be extended to get analytics data
            const modelDetails = await this.getModel(modelId);
            
            if (!modelDetails.success) {
                throw new Error('Model not found');
            }
            
            const analytics = {
                modelInfo: modelDetails.model,
                deployments: modelDetails.deployments,
                metrics: modelDetails.recentMetrics,
                summary: {
                    totalRequests: modelDetails.recentMetrics.reduce((sum, m) => sum + (m.request_count || 0), 0),
                    successRate: this.calculateSuccessRate(modelDetails.recentMetrics),
                    averageLatency: this.calculateAverageLatency(modelDetails.recentMetrics),
                    averageConfidence: this.calculateAverageConfidence(modelDetails.recentMetrics)
                }
            };
            
            return {
                success: true,
                analytics,
                timeRange
            };
        } catch (error) {
            logger.error('Failed to get model analytics', { 
                modelId, 
                error: error.message 
            });
            throw new Error(`Get model analytics failed: ${error.message}`);
        }
    }
    
    /**
     * Compare models performance
     */
    async compareModels(modelIds) {
        try {
            const modelComparisons = await Promise.all(
                modelIds.map(async (modelId) => {
                    try {
                        const analytics = await this.getModelAnalytics(modelId);
                        return {
                            modelId,
                            modelInfo: analytics.analytics.modelInfo,
                            performance: analytics.analytics.summary
                        };
                    } catch (error) {
                        return {
                            modelId,
                            error: error.message
                        };
                    }
                })
            );
            
            return {
                success: true,
                comparisons: modelComparisons,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Failed to compare models', { 
                modelIds, 
                error: error.message 
            });
            throw new Error(`Compare models failed: ${error.message}`);
        }
    }
    
    /**
     * Suggest model for deployment based on performance
     */
    async suggestBestModel(taskType, modelType = null) {
        try {
            const models = await this.listModels({
                taskType,
                modelType,
                status: 'uploaded'
            });
            
            if (!models.success || models.models.length === 0) {
                return {
                    success: false,
                    message: 'No models found for the specified criteria'
                };
            }
            
            // Score models based on metrics
            const scoredModels = await Promise.all(
                models.models.map(async (model) => {
                    try {
                        const analytics = await this.getModelAnalytics(model.id);
                        const score = this.calculateModelScore(analytics.analytics.summary);
                        
                        return {
                            ...model,
                            score,
                            analytics: analytics.analytics.summary
                        };
                    } catch (error) {
                        return {
                            ...model,
                            score: 0,
                            error: error.message
                        };
                    }
                })
            );
            
            // Sort by score descending
            scoredModels.sort((a, b) => (b.score || 0) - (a.score || 0));
            
            return {
                success: true,
                recommendation: scoredModels[0],
                alternatives: scoredModels.slice(1, 5),
                criteria: { taskType, modelType }
            };
        } catch (error) {
            logger.error('Failed to suggest best model', { 
                taskType, 
                modelType, 
                error: error.message 
            });
            throw new Error(`Suggest best model failed: ${error.message}`);
        }
    }
    
    // Helper methods
    calculateSuccessRate(metrics) {
        const totalSuccess = metrics.reduce((sum, m) => sum + (m.success_count || 0), 0);
        const totalRequests = metrics.reduce((sum, m) => sum + (m.request_count || 0), 0);
        return totalRequests > 0 ? (totalSuccess / totalRequests) * 100 : 0;
    }
    
    calculateAverageLatency(metrics) {
        const validMetrics = metrics.filter(m => m.avg_latency_ms !== null);
        if (validMetrics.length === 0) return 0;
        
        const sum = validMetrics.reduce((sum, m) => sum + m.avg_latency_ms, 0);
        return sum / validMetrics.length;
    }
    
    calculateAverageConfidence(metrics) {
        const validMetrics = metrics.filter(m => m.avg_confidence !== null);
        if (validMetrics.length === 0) return 0;
        
        const sum = validMetrics.reduce((sum, m) => sum + m.avg_confidence, 0);
        return sum / validMetrics.length;
    }
    
    calculateModelScore(summary) {
        // Simple scoring algorithm (can be enhanced)
        const successWeight = 0.4;
        const latencyWeight = 0.3;
        const confidenceWeight = 0.3;
        
        const successScore = Math.min(summary.successRate || 0, 100) / 100;
        const latencyScore = summary.averageLatency ? Math.max(0, 1 - (summary.averageLatency / 1000)) : 0;
        const confidenceScore = (summary.averageConfidence || 0) / 100;
        
        return (successScore * successWeight) + 
               (latencyScore * latencyWeight) + 
               (confidenceScore * confidenceWeight);
    }
}

module.exports = ModelRegistryIntegration;