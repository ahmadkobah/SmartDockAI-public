const SearchService = require('../services/SearchService');

/**
 * SearchController - Handle search-related HTTP requests
 */
class SearchController {

  /**
   * Search documents with full-text search capabilities
   * GET /api/search/documents
   */
  static async searchDocuments(req, res) {
    try {
      const userId = req.user.id;
      const {
        q: query = '',
        type,
        dateFrom,
        dateTo,
        minSize,
        maxSize,
        minConfidence,
        metadata,
        page = 1,
        limit = 20,
        _sortBy = 'relevance',
        _sortOrder = 'desc'
      } = req.query;

      // Validate pagination parameters
      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

      // Build filters object
      const filters = {};
      if (type) filters.type = type;
      if (dateFrom) filters.dateFrom = new Date(dateFrom);
      if (dateTo) filters.dateTo = new Date(dateTo);
      if (minSize) filters.minSize = parseInt(minSize, 10);
      if (maxSize) filters.maxSize = parseInt(maxSize, 10);
      if (minConfidence) filters.minConfidence = parseFloat(minConfidence);
      if (metadata) {
        try {
          filters.metadata = JSON.parse(metadata);
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: 'Invalid metadata filter format. Must be valid JSON.',
            error: error.message
          });
        }
      }

      // Perform search
      const results = await SearchService.searchDocuments({
        query,
        userId,
        filters,
        pagination: { page: pageNum, limit: limitNum }
      });

      res.json({
        success: true,
        message: 'Search completed successfully',
        ...results
      });

    } catch (error) {
      console.error('Document search error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search documents',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Find similar documents based on content
   * GET /api/search/similar/:documentId
   */
  static async findSimilarDocuments(req, res) {
    try {
      const userId = req.user.id;
      const { documentId } = req.params;
      const { limit = 5 } = req.query;

      const limitNum = Math.min(20, Math.max(1, parseInt(limit, 10)));

      const similarDocuments = await SearchService.findSimilarDocuments(
        documentId,
        userId,
        limitNum
      );

      res.json({
        success: true,
        message: 'Similar documents found',
        documents: similarDocuments,
        count: similarDocuments.length
      });

    } catch (error) {
      console.error('Similar documents search error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to find similar documents',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get search suggestions based on partial query
   * GET /api/search/suggestions
   */
  static async getSearchSuggestions(req, res) {
    try {
      const userId = req.user.id;
      const { q: partialQuery = '', limit = 10 } = req.query;

      if (!partialQuery.trim()) {
        return res.json({
          success: true,
          message: 'No suggestions for empty query',
          suggestions: []
        });
      }

      const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));

      const suggestions = await SearchService.getSearchSuggestions(
        partialQuery,
        userId,
        limitNum
      );

      res.json({
        success: true,
        message: 'Search suggestions retrieved',
        suggestions,
        count: suggestions.length
      });

    } catch (error) {
      console.error('Search suggestions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get search suggestions',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get search analytics and statistics
   * GET /api/search/analytics
   */
  static async getSearchAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const { timeRange = '30 days' } = req.query;

      // Validate time range
      const validRanges = ['7 days', '30 days', '90 days', '1 year'];
      const validatedRange = validRanges.includes(timeRange) ? timeRange : '30 days';

      const analytics = await SearchService.getSearchAnalytics(userId, validatedRange);

      res.json({
        success: true,
        message: 'Search analytics retrieved',
        analytics: {
          ...analytics,
          timeRange: validatedRange,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Search analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get search analytics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Advanced search with complex filters and faceted search
   * POST /api/search/advanced
   */
  static async advancedSearch(req, res) {
    try {
      const userId = req.user.id;
      const {
        query = '',
        filters = {},
        facets = [],
        pagination = { page: 1, limit: 20 },
        sorting = { field: 'relevance', order: 'desc' },
        highlight = true
      } = req.body;

      // Validate and sanitize inputs
      const validatedPagination = {
        page: Math.max(1, parseInt(pagination.page, 10) || 1),
        limit: Math.min(100, Math.max(1, parseInt(pagination.limit, 10) || 20))
      };

      // Perform advanced search
      const results = await SearchService.searchDocuments({
        query,
        userId,
        filters,
        pagination: validatedPagination
      });

      // Add faceted search results if requested
      if (facets.length > 0) {
        results.facets = await this.buildFacetResults(userId, facets, filters);
      }

      res.json({
        success: true,
        message: 'Advanced search completed successfully',
        ...results,
        searchConfig: {
          highlight,
          sorting,
          facetsRequested: facets
        }
      });

    } catch (error) {
      console.error('Advanced search error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform advanced search',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Build faceted search results for advanced search
   */
  static async buildFacetResults(userId, facets, filters) {
    const DatabaseService = require('../services/DatabaseService');
    const client = await DatabaseService.getConnection();
    
    try {
      const facetResults = {};

      for (const facet of facets) {
        switch (facet) {
          case 'type':
            facetResults.type = await this.getTypeFacets(client, userId, filters);
            break;
          case 'dateRange':
            facetResults.dateRange = await this.getDateRangeFacets(client, userId, filters);
            break;
          case 'fileSize':
            facetResults.fileSize = await this.getFileSizeFacets(client, userId, filters);
            break;
          case 'confidence':
            facetResults.confidence = await this.getConfidenceFacets(client, userId, filters);
            break;
          default:
            console.warn(`Unknown facet requested: ${facet}`);
        }
      }

      return facetResults;
    } finally {
      client.release();
    }
  }

  /**
   * Get document type facets
   */
  static async getTypeFacets(client, userId, _filters) {
    const query = `
      SELECT d.type, COUNT(*) as count
      FROM documents d
      WHERE d.user_id = $1
      GROUP BY d.type
      ORDER BY count DESC
    `;

    const result = await client.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get date range facets
   */
  static async getDateRangeFacets(client, userId, _filters) {
    const query = `
      SELECT 
        CASE 
          WHEN d.created_at >= NOW() - INTERVAL '1 day' THEN 'today'
          WHEN d.created_at >= NOW() - INTERVAL '1 week' THEN 'this_week'
          WHEN d.created_at >= NOW() - INTERVAL '1 month' THEN 'this_month'
          WHEN d.created_at >= NOW() - INTERVAL '1 year' THEN 'this_year'
          ELSE 'older'
        END as date_range,
        COUNT(*) as count
      FROM documents d
      WHERE d.user_id = $1
      GROUP BY date_range
      ORDER BY count DESC
    `;

    const result = await client.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get file size facets
   */
  static async getFileSizeFacets(client, userId, _filters) {
    const query = `
      SELECT 
        CASE 
          WHEN d.file_size < 1024 * 1024 THEN 'small'
          WHEN d.file_size < 10 * 1024 * 1024 THEN 'medium'
          WHEN d.file_size < 100 * 1024 * 1024 THEN 'large'
          ELSE 'very_large'
        END as size_range,
        COUNT(*) as count
      FROM documents d
      WHERE d.user_id = $1
      GROUP BY size_range
      ORDER BY count DESC
    `;

    const result = await client.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get OCR confidence facets
   */
  static async getConfidenceFacets(client, userId, _filters) {
    const query = `
      SELECT 
        CASE 
          WHEN ocr.confidence_score >= 0.9 THEN 'high'
          WHEN ocr.confidence_score >= 0.7 THEN 'medium'
          WHEN ocr.confidence_score >= 0.5 THEN 'low'
          ELSE 'very_low'
        END as confidence_range,
        COUNT(*) as count
      FROM documents d
      LEFT JOIN ocr_icr_processing ocr ON d.id = ocr.document_id
      WHERE d.user_id = $1 AND ocr.confidence_score IS NOT NULL
      GROUP BY confidence_range
      ORDER BY count DESC
    `;

    const result = await client.query(query, [userId]);
    return result.rows;
  }
}

module.exports = SearchController;