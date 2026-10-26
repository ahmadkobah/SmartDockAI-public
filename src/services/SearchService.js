const DatabaseService = require('./DatabaseService');

/**
 * SearchService - Full-text search functionality
 * Provides comprehensive search capabilities across documents and OCR content
 */
class SearchService {
  
  /**
   * Initialize search service and ensure search indexes exist
   */
  static async initialize() {
    try {
      await this.createSearchIndexes();
  console.warn('SearchService initialized successfully');
    } catch (error) {
  console.error('SearchService initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Create full-text search indexes for better performance
   */
  static async createSearchIndexes() {
    const client = await DatabaseService.getConnection();
    
    try {
  // Create GIN index for document title and description search
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_documents_search 
        ON documents USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')))
      `);

  // Create GIN index for OCR content search
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_ocr_content_search 
        ON ocr_icr_processing USING gin(to_tsvector('english', extracted_text))
      `);

  // Create GIN index for metadata search
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_ocr_metadata_search 
        ON ocr_icr_processing USING gin(metadata)
      `);

  // Create composite index for filtered searches
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_documents_filtered_search 
        ON documents(user_id, type, created_at)
      `);

  console.warn('Search indexes created successfully');
    } finally {
      client.release();
    }
  }

  /**
   * Perform full-text search across documents and OCR content
   * @param {Object} params - Search parameters
   * @param {string} params.query - Search query
   * @param {number} params.userId - User ID for filtering
   * @param {Object} params.filters - Additional filters
   * @param {Object} params.pagination - Pagination options
   * @returns {Promise<Object>} Search results with metadata
   */
  static async searchDocuments({
    query,
    userId,
    filters = {},
    pagination = { page: 1, limit: 20 }
  }) {
    const client = await DatabaseService.getConnection();
    
    try {
      const searchQuery = this.buildSearchQuery(query, userId, filters, pagination);
      const countQuery = this.buildCountQuery(query, userId, filters);
      
  // Execute search and count queries
      const [searchResult, countResult] = await Promise.all([
        client.query(searchQuery.text, searchQuery.values),
        client.query(countQuery.text, countQuery.values)
      ]);

      const documents = searchResult.rows;
      const totalCount = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalCount / pagination.limit);

  // Enhance results with search highlights and metadata
      const enhancedDocuments = await this.enhanceSearchResults(documents, query);

      return {
        documents: enhancedDocuments,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          totalCount,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1
        },
        searchMetadata: {
          query,
          filters,
          executionTime: Date.now(),
          resultCount: documents.length
        }
      };
    } finally {
      client.release();
    }
  }

  /**
   * Build the main search query with full-text search capabilities
   */
  static buildSearchQuery(query, userId, filters, pagination) {
    let baseQuery = `
      SELECT DISTINCT
        d.id,
        d.title,
        d.description,
        d.type,
        d.file_name,
        d.file_size,
        d.created_at,
        d.updated_at,
        ocr.extracted_text,
        ocr.confidence_score,
        ocr.metadata as ocr_metadata,
        -- Calculate search relevance score
        GREATEST(
          ts_rank(to_tsvector('english', d.title || ' ' || COALESCE(d.description, '')), plainto_tsquery('english', $1)),
          COALESCE(ts_rank(to_tsvector('english', ocr.extracted_text), plainto_tsquery('english', $1)), 0)
        ) as relevance_score,
        -- Create search highlights
        ts_headline('english', d.title, plainto_tsquery('english', $1), 'MaxWords=10,HighlightAll=false') as title_highlight,
        ts_headline('english', COALESCE(d.description, ''), plainto_tsquery('english', $1), 'MaxWords=20') as description_highlight,
        ts_headline('english', COALESCE(ocr.extracted_text, ''), plainto_tsquery('english', $1), 'MaxWords=30') as content_highlight
      FROM documents d
      LEFT JOIN ocr_icr_processing ocr ON d.id = ocr.document_id
      WHERE d.user_id = $2
    `;

    const queryParams = [query, userId];
    let paramIndex = 3;

    // Add search condition
    if (query && query.trim()) {
      baseQuery += ` AND (
        to_tsvector('english', d.title || ' ' || COALESCE(d.description, '')) @@ plainto_tsquery('english', $1)
        OR to_tsvector('english', COALESCE(ocr.extracted_text, '')) @@ plainto_tsquery('english', $1)
      )`;
    }

    // Add type filter
    if (filters.type) {
      baseQuery += ` AND d.type = $${paramIndex}`;
      queryParams.push(filters.type);
      paramIndex++;
    }

    // Add date range filter
    if (filters.dateFrom) {
      baseQuery += ` AND d.created_at >= $${paramIndex}`;
      queryParams.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters.dateTo) {
      baseQuery += ` AND d.created_at <= $${paramIndex}`;
      queryParams.push(filters.dateTo);
      paramIndex++;
    }

    // Add file size filter
    if (filters.minSize) {
      baseQuery += ` AND d.file_size >= $${paramIndex}`;
      queryParams.push(filters.minSize);
      paramIndex++;
    }

    if (filters.maxSize) {
      baseQuery += ` AND d.file_size <= $${paramIndex}`;
      queryParams.push(filters.maxSize);
      paramIndex++;
    }

    // Add OCR confidence filter
    if (filters.minConfidence) {
      baseQuery += ` AND ocr.confidence_score >= $${paramIndex}`;
      queryParams.push(filters.minConfidence);
      paramIndex++;
    }

    // Add metadata filter (JSON search)
    if (filters.metadata) {
      baseQuery += ` AND ocr.metadata @> $${paramIndex}::jsonb`;
      queryParams.push(JSON.stringify(filters.metadata));
      paramIndex++;
    }

    // Order by relevance and date
    baseQuery += ` ORDER BY relevance_score DESC, d.created_at DESC`;

    // Add pagination
    const offset = (pagination.page - 1) * pagination.limit;
    baseQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(pagination.limit, offset);

    return {
      text: baseQuery,
      values: queryParams
    };
  }

  /**
   * Build count query for pagination
   */
  static buildCountQuery(query, userId, filters) {
    let countQuery = `
      SELECT COUNT(DISTINCT d.id) as count
      FROM documents d
      LEFT JOIN ocr_icr_processing ocr ON d.id = ocr.document_id
      WHERE d.user_id = $2
    `;

    const queryParams = [query, userId];
    let paramIndex = 3;

    // Add search condition
    if (query && query.trim()) {
      countQuery += ` AND (
        to_tsvector('english', d.title || ' ' || COALESCE(d.description, '')) @@ plainto_tsquery('english', $1)
        OR to_tsvector('english', COALESCE(ocr.extracted_text, '')) @@ plainto_tsquery('english', $1)
      )`;
    }

    // Add filters (same as main query)
    if (filters.type) {
      countQuery += ` AND d.type = $${paramIndex}`;
      queryParams.push(filters.type);
      paramIndex++;
    }

    if (filters.dateFrom) {
      countQuery += ` AND d.created_at >= $${paramIndex}`;
      queryParams.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters.dateTo) {
      countQuery += ` AND d.created_at <= $${paramIndex}`;
      queryParams.push(filters.dateTo);
      paramIndex++;
    }

    if (filters.minSize) {
      countQuery += ` AND d.file_size >= $${paramIndex}`;
      queryParams.push(filters.minSize);
      paramIndex++;
    }

    if (filters.maxSize) {
      countQuery += ` AND d.file_size <= $${paramIndex}`;
      queryParams.push(filters.maxSize);
      paramIndex++;
    }

    if (filters.minConfidence) {
      countQuery += ` AND ocr.confidence_score >= $${paramIndex}`;
      queryParams.push(filters.minConfidence);
      paramIndex++;
    }

    if (filters.metadata) {
      countQuery += ` AND ocr.metadata @> $${paramIndex}::jsonb`;
      queryParams.push(JSON.stringify(filters.metadata));
      paramIndex++;
    }

    return {
      text: countQuery,
      values: queryParams
    };
  }

  /**
   * Enhance search results with additional metadata and processing
   */
  static async enhanceSearchResults(documents, _query) {
    return documents.map(doc => {
      // Calculate match types
      const matchTypes = [];
      if (doc.title_highlight !== doc.title) matchTypes.push('title');
      if (doc.description_highlight !== doc.description) matchTypes.push('description');
      if (doc.content_highlight && doc.extracted_text) matchTypes.push('content');

      // Extract key phrases from OCR metadata
      const keyPhrases = this.extractKeyPhrases(doc.ocr_metadata);

      return {
        ...doc,
        matchTypes,
        keyPhrases,
        hasOcr: !!doc.extracted_text,
        searchScore: parseFloat(doc.relevance_score) || 0
      };
    });
  }

  /**
   * Extract key phrases from OCR metadata for search enhancement
   */
  static extractKeyPhrases(metadata) {
    if (!metadata) return [];

    const keyPhrases = [];
    
    try {
      const meta = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      
      // Extract various fields that might contain important phrases
      const fieldsToCheck = [
        'invoiceNumber', 'company', 'vendor', 'customerName',
        'name', 'documentNumber', 'contractTitle', 'partyNames'
      ];

      fieldsToCheck.forEach(field => {
        if (meta[field] && typeof meta[field] === 'string') {
          keyPhrases.push({
            type: field,
            value: meta[field],
            confidence: meta.confidence || 0.8
          });
        }
      });

      return keyPhrases;
    } catch (error) {
      console.warn('Error extracting key phrases from metadata:', error);
      return [];
    }
  }

  /**
   * Search for similar documents based on content similarity
   */
  static async findSimilarDocuments(documentId, userId, limit = 5) {
    const client = await DatabaseService.getConnection();
    
    try {
      const query = `
        WITH target_doc AS (
          SELECT ocr.extracted_text, d.type
          FROM documents d
          LEFT JOIN ocr_icr_processing ocr ON d.id = ocr.document_id
          WHERE d.id = $1 AND d.user_id = $2
        ),
        similarity_scores AS (
          SELECT 
            d.id,
            d.title,
            d.type,
            d.created_at,
            similarity(
              COALESCE(target_doc.extracted_text, ''),
              COALESCE(ocr.extracted_text, '')
            ) as content_similarity,
            CASE WHEN d.type = target_doc.type THEN 0.2 ELSE 0 END as type_bonus
          FROM documents d
          LEFT JOIN ocr_icr_processing ocr ON d.id = ocr.document_id
          CROSS JOIN target_doc
          WHERE d.user_id = $2 
            AND d.id != $1
            AND ocr.extracted_text IS NOT NULL
        )
        SELECT *,
          (content_similarity + type_bonus) as total_similarity
        FROM similarity_scores
        WHERE content_similarity > 0.1
        ORDER BY total_similarity DESC
        LIMIT $3
      `;

      const result = await client.query(query, [documentId, userId, limit]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get search suggestions based on query history and content
   */
  static async getSearchSuggestions(partialQuery, userId, limit = 10) {
    const client = await DatabaseService.getConnection();
    
    try {
      const query = `
        SELECT DISTINCT
          CASE 
            WHEN d.title ILIKE $1 THEN d.title
            WHEN d.description ILIKE $1 THEN substring(d.description, 1, 50)
            ELSE substring(ocr.extracted_text, 1, 50)
          END as suggestion,
          'document' as type,
          COUNT(*) as frequency
        FROM documents d
        LEFT JOIN ocr_icr_processing ocr ON d.id = ocr.document_id
        WHERE d.user_id = $2
          AND (
            d.title ILIKE $1
            OR d.description ILIKE $1
            OR ocr.extracted_text ILIKE $1
          )
        GROUP BY suggestion
        ORDER BY frequency DESC, suggestion
        LIMIT $3
      `;

      const searchPattern = `%${partialQuery}%`;
      const result = await client.query(query, [searchPattern, userId, limit]);
      
      return result.rows.map(row => ({
        text: row.suggestion,
        type: row.type,
        frequency: parseInt(row.frequency, 10)
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Get search analytics and statistics
   */
  static async getSearchAnalytics(userId, timeRange = '30 days') {
    const client = await DatabaseService.getConnection();
    
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT d.id) as total_documents,
          COUNT(DISTINCT CASE WHEN ocr.extracted_text IS NOT NULL THEN d.id END) as ocr_documents,
          AVG(ocr.confidence_score) as avg_confidence,
          COUNT(DISTINCT d.type) as document_types,
          jsonb_object_agg(d.type, type_counts.count) as type_distribution
        FROM documents d
        LEFT JOIN ocr_icr_processing ocr ON d.id = ocr.document_id
        LEFT JOIN (
          SELECT type, COUNT(*) as count
          FROM documents
          WHERE user_id = $1
            AND created_at >= NOW() - INTERVAL '${timeRange}'
          GROUP BY type
        ) type_counts ON d.type = type_counts.type
        WHERE d.user_id = $1
          AND d.created_at >= NOW() - INTERVAL '${timeRange}'
      `;

      const result = await client.query(query, [userId]);
      return result.rows[0] || {};
    } finally {
      client.release();
    }
  }
}

module.exports = SearchService;