/**
 * Model Registry Routes
 * 
 * Defines REST API routes for model registry management.
 */

const express = require('express');
const { controller, uploadMiddleware } = require('../controllers/ModelRegistryController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all model registry routes
router.use(authenticate);

/**
 * @route GET /api/models/registry/health
 * @desc Check Model Registry service health
 * @access Private
 */
router.get('/health', controller.getHealth.bind(controller));

/**
 * @route GET /api/models/registry/info
 * @desc Get Model Registry service information
 * @access Private
 */
router.get('/info', controller.getServiceInfo.bind(controller));

/**
 * @route GET /api/models/registry/models
 * @desc List all models with optional filtering
 * @access Private
 * @query {string} model_type - Filter by model type
 * @query {string} task_type - Filter by task type
 * @query {string} status - Filter by status
 * @query {number} limit - Number of results to return (default: 100)
 * @query {number} offset - Offset for pagination (default: 0)
 */
router.get('/models', controller.listModels.bind(controller));

/**
 * @route GET /api/models/registry/models/:modelId
 * @desc Get detailed information about a specific model
 * @access Private
 * @param {string} modelId - Model ID
 */
router.get('/models/:modelId', controller.getModel.bind(controller));

/**
 * @route POST /api/models/registry/models/upload
 * @desc Upload a new model to the registry
 * @access Private (Admin/DataScientist only)
 * @body {string} name - Model name
 * @body {string} model_type - Model type (e.g., 'classification', 'regression')
 * @body {string} task_type - Task type (e.g., 'ocr', 'nlp', 'icr')
 * @body {string} framework - Framework used (e.g., 'pytorch', 'tensorflow')
 * @body {string} version - Model version
 * @body {string} description - Model description (optional)
 * @body {string} tags - Comma-separated tags (optional)
 * @body {object} metrics - Model metrics (optional, JSON string)
 * @body {object} config - Model configuration (optional, JSON string)
 * @file model_file - Model file to upload
 */
router.post('/models/upload', 
    authorize(['admin', 'data_scientist']),
    uploadMiddleware,
    controller.uploadModel.bind(controller)
);

/**
 * @route POST /api/models/registry/models/:modelId/deploy
 * @desc Deploy a model to a service
 * @access Private (Admin/DataScientist only)
 * @param {string} modelId - Model ID
 * @body {string} service_name - Target service name
 * @body {string} environment - Deployment environment (default: 'production')
 * @body {object} config - Deployment configuration (optional)
 */
router.post('/models/:modelId/deploy',
    authorize(['admin', 'data_scientist']),
    controller.deployModel.bind(controller)
);

/**
 * @route GET /api/models/registry/services/:serviceName/models
 * @desc Get deployed models for a service
 * @access Private
 * @param {string} serviceName - Service name
 * @query {string} environment - Environment filter (default: 'production')
 */
router.get('/services/:serviceName/models', controller.getDeployedModels.bind(controller));

/**
 * @route POST /api/models/registry/metrics
 * @desc Record performance metrics for a model
 * @access Private
 * @body {string} model_id - Model ID
 * @body {number} latency - Response latency in milliseconds (optional)
 * @body {number} accuracy - Model accuracy (optional)
 * @body {number} confidence - Model confidence score (optional)
 * @body {number} memory_usage - Memory usage in MB (optional)
 * @body {object} custom_metrics - Custom metrics object (optional)
 */
router.post('/metrics', controller.recordMetrics.bind(controller));

/**
 * @route DELETE /api/models/registry/models/:modelId
 * @desc Delete a model from the registry
 * @access Private (Admin only)
 * @param {string} modelId - Model ID
 */
router.delete('/models/:modelId',
    authorize(['admin']),
    controller.deleteModel.bind(controller)
);

/**
 * @route GET /api/models/registry/models/:modelId/analytics
 * @desc Get model performance analytics
 * @access Private
 * @param {string} modelId - Model ID
 * @query {string} time_range - Time range for analytics (default: '7d')
 */
router.get('/models/:modelId/analytics', controller.getModelAnalytics.bind(controller));

/**
 * @route POST /api/models/registry/models/compare
 * @desc Compare performance of multiple models
 * @access Private
 * @body {array} model_ids - Array of model IDs to compare (minimum 2)
 */
router.post('/models/compare', controller.compareModels.bind(controller));

/**
 * @route GET /api/models/registry/recommendations
 * @desc Get model recommendations for deployment
 * @access Private
 * @query {string} task_type - Task type for recommendations (required)
 * @query {string} model_type - Model type filter (optional)
 */
router.get('/recommendations', controller.getModelRecommendations.bind(controller));

module.exports = router;
