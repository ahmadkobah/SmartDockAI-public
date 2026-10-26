const express = require('express');
const ocrController = require('../controllers/OCRController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   POST /api/ocr/documents/:documentId/process
 * @desc    Start OCR processing for a document
 * @access  Private (authenticated users - own documents only)
 */
router.post('/documents/:documentId/process', ocrController.processDocument);

/**
 * @route   POST /api/ocr/documents/:documentId/pipeline
 * @desc    Execute full processing pipeline for a document
 * @access  Private (authenticated users - own documents only)
 */
router.post('/documents/:documentId/pipeline', ocrController.processPipeline);


/**
 * @route   GET /api/ocr/jobs
 * @desc    List all OCR jobs (optionally filter by queueType/status)
 * @access  Private (authenticated users)
 */
router.get('/jobs', ocrController.listJobs);

/**
 * @route   GET /api/ocr/jobs/:jobId/status
 * @desc    Get OCR job status
 * @access  Private (authenticated users)
 */
router.get('/jobs/:jobId/status', ocrController.getJobStatus);

/**
 * @route   POST /api/ocr/jobs/:jobId/retry
 * @desc    Retry failed OCR job
 * @access  Private (authenticated users)
 */
router.post('/jobs/:jobId/retry', ocrController.retryJob);

/**
 * @route   DELETE /api/ocr/jobs/:jobId/cancel
 * @desc    Cancel OCR job
 * @access  Private (authenticated users)
 */
router.delete('/jobs/:jobId/cancel', ocrController.cancelJob);

/**
 * @route   GET /api/ocr/pipelines
 * @desc    Get available processing pipelines
 * @access  Private (authenticated users)
 */
router.get('/pipelines', ocrController.getPipelines);

/**
 * @route   GET /api/ocr/pipelines/:pipelineId
 * @desc    Get pipeline configuration
 * @access  Private (authenticated users)
 */
router.get('/pipelines/:pipelineId', ocrController.getPipelineConfig);

// Admin-only routes
/**
 * @route   GET /api/ocr/admin/statistics
 * @desc    Get OCR and queue statistics
 * @access  Private (admin only)
 */
router.get('/admin/statistics', 
  authorize(['admin']),
  ocrController.getStatistics
);

/**
 * @route   POST /api/ocr/admin/clean-jobs
 * @desc    Clean old jobs from queues
 * @access  Private (admin only)
 */
router.post('/admin/clean-jobs',
  authorize(['admin']),
  ocrController.cleanJobs
);

module.exports = router;