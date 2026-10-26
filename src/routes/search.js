const express = require('express');
const SearchController = require('../controllers/SearchController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/search/documents
 * @desc    Search documents with full-text search
 * @access  Private (authenticated users)
 * @param   {string} q - Search query
 * @param   {string} type - Document type filter
 * @param   {string} dateFrom - Start date filter (ISO format)
 * @param   {string} dateTo - End date filter (ISO format)
 * @param   {number} minSize - Minimum file size filter (bytes)
 * @param   {number} maxSize - Maximum file size filter (bytes)
 * @param   {number} minConfidence - Minimum OCR confidence filter (0-1)
 * @param   {string} metadata - JSON metadata filter
 * @param   {number} page - Page number (default: 1)
 * @param   {number} limit - Results per page (default: 20, max: 100)
 */
router.get('/documents', SearchController.searchDocuments);

/**
 * @route   GET /api/search/similar/:documentId
 * @desc    Find documents similar to the specified document
 * @access  Private (authenticated users)
 * @param   {string} documentId - ID of the reference document
 * @param   {number} limit - Maximum number of similar documents (default: 5, max: 20)
 */
router.get('/similar/:documentId', SearchController.findSimilarDocuments);

/**
 * @route   GET /api/search/suggestions
 * @desc    Get search suggestions based on partial query
 * @access  Private (authenticated users)
 * @param   {string} q - Partial search query
 * @param   {number} limit - Maximum number of suggestions (default: 10, max: 50)
 */
router.get('/suggestions', SearchController.getSearchSuggestions);

/**
 * @route   GET /api/search/analytics
 * @desc    Get search analytics and statistics for the user
 * @access  Private (authenticated users)
 * @param   {string} timeRange - Time range for analytics (7 days, 30 days, 90 days, 1 year)
 */
router.get('/analytics', SearchController.getSearchAnalytics);

/**
 * @route   POST /api/search/advanced
 * @desc    Perform advanced search with complex filters and facets
 * @access  Private (authenticated users)
 * @body    {object} Search configuration with query, filters, facets, pagination, and sorting
 */
router.post('/advanced', SearchController.advancedSearch);

module.exports = router;