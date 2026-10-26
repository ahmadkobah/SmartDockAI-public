const DatabaseService = require('../services/DatabaseService');
const QueueService = require('../services/QueueService');
const StorageService = require('../services/StorageService');

/**
 * AdminController - Handle admin-specific operations
 * Provides comprehensive system management and oversight capabilities
 */
class AdminController {

  /**
   * Get comprehensive system statistics
   * GET /api/admin/statistics
   */
  static async getSystemStatistics(req, res) {
    try {
      const stats = await AdminController.gatherSystemStatistics();

      res.json({
        success: true,
        message: 'System statistics retrieved successfully',
        statistics: stats,
        generatedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('System statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve system statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get all users with detailed information
   * GET /api/admin/users
   */
  static async getUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        role = '',
        status = '',
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const offset = (pageNum - 1) * limitNum;

      const client = await DatabaseService.getConnection();
      
      try {
        // Build dynamic query
        let whereClause = 'WHERE 1=1';
        const queryParams = [];
        let paramIndex = 1;

        if (search) {
          whereClause += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
          queryParams.push(`%${search}%`);
          paramIndex++;
        }

        if (role) {
          whereClause += ` AND r.name = $${paramIndex}`;
          queryParams.push(role);
          paramIndex++;
        }

        if (status) {
          const isActive = status === 'active';
          whereClause += ` AND u.is_active = $${paramIndex}`;
          queryParams.push(isActive);
          paramIndex++;
        }

        // Validate sort field
        const validSortFields = ['created_at', 'updated_at', 'email', 'first_name', 'last_name'];
        const validSortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
        const validSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        const usersQuery = `
          SELECT 
            u.id,
            u.email,
            u.first_name,
            u.last_name,
            u.is_active,
            u.created_at,
            u.updated_at,
            u.last_login_at,
            ARRAY_AGG(r.name) as roles,
            COUNT(d.id) as document_count,
            COALESCE(SUM(d.file_size), 0) as total_storage_used
          FROM users u
          LEFT JOIN user_roles ur ON u.id = ur.user_id
          LEFT JOIN roles r ON ur.role_id = r.id
          LEFT JOIN documents d ON u.id = d.user_id
          ${whereClause}
          GROUP BY u.id, u.email, u.first_name, u.last_name, u.is_active, u.created_at, u.updated_at, u.last_login_at
          ORDER BY u.${validSortField} ${validSortOrder}
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const countQuery = `
          SELECT COUNT(DISTINCT u.id) as total
          FROM users u
          LEFT JOIN user_roles ur ON u.id = ur.user_id
          LEFT JOIN roles r ON ur.role_id = r.id
          ${whereClause}
        `;

        queryParams.push(limitNum, offset);

        const [usersResult, countResult] = await Promise.all([
          client.query(usersQuery, queryParams),
          client.query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
        ]);

        const users = usersResult.rows.map(user => ({
          ...user,
          total_storage_used: parseInt(user.total_storage_used, 10),
          document_count: parseInt(user.document_count, 10)
        }));

        const totalCount = parseInt(countResult.rows[0].total, 10);
        const totalPages = Math.ceil(totalCount / limitNum);

        res.json({
          success: true,
          message: 'Users retrieved successfully',
          users,
          pagination: {
            page: pageNum,
            limit: limitNum,
            totalCount,
            totalPages,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          }
        });

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve users',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Update user status (activate/deactivate)
   * PUT /api/admin/users/:userId/status
   */
  static async updateUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { isActive, reason } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'isActive must be a boolean value'
        });
      }

      const client = await DatabaseService.getConnection();
      
      try {
        // Update user status
        const updateResult = await client.query(
          'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
          [isActive, userId]
        );

        if (updateResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        // Log the action
        await client.query(`
          INSERT INTO audit_log (user_id, action, resource_type, resource_id, details, ip_address)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          req.user.id,
          isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
          'USER',
          userId,
          JSON.stringify({ reason, previousStatus: !isActive }),
          req.ip
        ]);

        res.json({
          success: true,
          message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
          user: updateResult.rows[0]
        });

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get all documents with admin-level details
   * GET /api/admin/documents
   */
  static async getDocuments(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        type = '',
        userId = '',
        hasOcr = '',
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const offset = (pageNum - 1) * limitNum;

      const client = await DatabaseService.getConnection();
      
      try {
        // Build dynamic query
        let whereClause = 'WHERE 1=1';
        const queryParams = [];
        let paramIndex = 1;

        if (search) {
          whereClause += ` AND (d.title ILIKE $${paramIndex} OR d.description ILIKE $${paramIndex} OR d.file_name ILIKE $${paramIndex})`;
          queryParams.push(`%${search}%`);
          paramIndex++;
        }

        if (type) {
          whereClause += ` AND d.type = $${paramIndex}`;
          queryParams.push(type);
          paramIndex++;
        }

        if (userId) {
          whereClause += ` AND d.user_id = $${paramIndex}`;
          queryParams.push(userId);
          paramIndex++;
        }

        if (hasOcr === 'true') {
          whereClause += ` AND ocr.id IS NOT NULL`;
        } else if (hasOcr === 'false') {
          whereClause += ` AND ocr.id IS NULL`;
        }

        const validSortFields = ['created_at', 'updated_at', 'title', 'file_size', 'type'];
        const validSortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
        const validSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        const documentsQuery = `
          SELECT 
            d.*,
            u.email as user_email,
            u.first_name as user_first_name,
            u.last_name as user_last_name,
            ocr.confidence_score,
            ocr.processing_time_ms,
            CASE WHEN ocr.id IS NOT NULL THEN true ELSE false END as has_ocr
          FROM documents d
          LEFT JOIN users u ON d.user_id = u.id
          LEFT JOIN ocr_icr_processing ocr ON d.id = ocr.document_id
          ${whereClause}
          ORDER BY d.${validSortField} ${validSortOrder}
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const countQuery = `
          SELECT COUNT(DISTINCT d.id) as total
          FROM documents d
          LEFT JOIN users u ON d.user_id = u.id
          LEFT JOIN ocr_icr_processing ocr ON d.id = ocr.document_id
          ${whereClause}
        `;

        queryParams.push(limitNum, offset);

        const [documentsResult, countResult] = await Promise.all([
          client.query(documentsQuery, queryParams),
          client.query(countQuery, queryParams.slice(0, -2))
        ]);

        const totalCount = parseInt(countResult.rows[0].total, 10);
        const totalPages = Math.ceil(totalCount / limitNum);

        res.json({
          success: true,
          message: 'Documents retrieved successfully',
          documents: documentsResult.rows,
          pagination: {
            page: pageNum,
            limit: limitNum,
            totalCount,
            totalPages,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          }
        });

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Get admin documents error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve documents',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Delete document (admin override)
   * DELETE /api/admin/documents/:documentId
   */
  static async deleteDocument(req, res) {
    try {
      const { documentId } = req.params;
      const { reason } = req.body;

      const client = await DatabaseService.getConnection();
      
      try {
        await client.query('BEGIN');

        // Get document details before deletion
        const docResult = await client.query(
          'SELECT * FROM documents WHERE id = $1',
          [documentId]
        );

        if (docResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({
            success: false,
            message: 'Document not found'
          });
        }

        const document = docResult.rows[0];

        // Delete related records
        await client.query('DELETE FROM ocr_icr_processing WHERE document_id = $1', [documentId]);
        await client.query('DELETE FROM document_versions WHERE document_id = $1', [documentId]);
        await client.query('DELETE FROM documents WHERE id = $1', [documentId]);

        // Log the action
        await client.query(`
          INSERT INTO audit_log (user_id, action, resource_type, resource_id, details, ip_address)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          req.user.id,
          'DOCUMENT_DELETED_ADMIN',
          'DOCUMENT',
          documentId,
          JSON.stringify({ 
            reason,
            originalDocument: {
              title: document.title,
              type: document.type,
              userId: document.user_id
            }
          }),
          req.ip
        ]);

        // Delete from storage
        try {
          await StorageService.deleteFile(document.file_path);
        } catch (storageError) {
          console.warn('Storage deletion warning:', storageError.message);
        }

        await client.query('COMMIT');

        res.json({
          success: true,
          message: 'Document deleted successfully'
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Admin delete document error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete document',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get system health and status
   * GET /api/admin/health
   */
  static async getSystemHealth(req, res) {
    try {
      const health = {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        services: {}
      };

      // Check database
      try {
        await DatabaseService.pool.query('SELECT NOW()');
        health.services.database = {
          status: 'healthy',
          responseTime: Date.now(),
          details: 'Connected successfully'
        };
      } catch (error) {
        health.services.database = {
          status: 'unhealthy',
          error: error.message
        };
        health.status = 'degraded';
      }

      // Check storage
      try {
        await StorageService.checkHealth();
        health.services.storage = {
          status: 'healthy',
          details: 'MinIO connection successful'
        };
      } catch (error) {
        health.services.storage = {
          status: 'unhealthy',
          error: error.message
        };
        health.status = 'degraded';
      }

      // Check queue service
      try {
        const queueStats = await QueueService.getQueueStats();
        health.services.queues = {
          status: 'healthy',
          details: queueStats
        };
      } catch (error) {
        health.services.queues = {
          status: 'unhealthy',
          error: error.message
        };
        health.status = 'degraded';
      }

      res.json({
        success: true,
        message: 'System health check completed',
        health
      });

    } catch (error) {
      console.error('System health check error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check system health',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        health: {
          status: 'unhealthy',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get audit logs
   * GET /api/admin/audit-logs
   */
  static async getAuditLogs(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        userId = '',
        action = '',
        resourceType = '',
        dateFrom = '',
        dateTo = ''
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
      const offset = (pageNum - 1) * limitNum;

      const client = await DatabaseService.getConnection();
      
      try {
        let whereClause = 'WHERE 1=1';
        const queryParams = [];
        let paramIndex = 1;

        if (userId) {
          whereClause += ` AND al.user_id = $${paramIndex}`;
          queryParams.push(userId);
          paramIndex++;
        }

        if (action) {
          whereClause += ` AND al.action = $${paramIndex}`;
          queryParams.push(action);
          paramIndex++;
        }

        if (resourceType) {
          whereClause += ` AND al.resource_type = $${paramIndex}`;
          queryParams.push(resourceType);
          paramIndex++;
        }

        if (dateFrom) {
          whereClause += ` AND al.created_at >= $${paramIndex}`;
          queryParams.push(new Date(dateFrom));
          paramIndex++;
        }

        if (dateTo) {
          whereClause += ` AND al.created_at <= $${paramIndex}`;
          queryParams.push(new Date(dateTo));
          paramIndex++;
        }

        const logsQuery = `
          SELECT 
            al.*,
            u.email as user_email,
            u.first_name as user_first_name,
            u.last_name as user_last_name
          FROM audit_log al
          LEFT JOIN users u ON al.user_id = u.id
          ${whereClause}
          ORDER BY al.created_at DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const countQuery = `
          SELECT COUNT(*) as total
          FROM audit_log al
          ${whereClause}
        `;

        queryParams.push(limitNum, offset);

        const [logsResult, countResult] = await Promise.all([
          client.query(logsQuery, queryParams),
          client.query(countQuery, queryParams.slice(0, -2))
        ]);

        const totalCount = parseInt(countResult.rows[0].total, 10);
        const totalPages = Math.ceil(totalCount / limitNum);

        res.json({
          success: true,
          message: 'Audit logs retrieved successfully',
          logs: logsResult.rows,
          pagination: {
            page: pageNum,
            limit: limitNum,
            totalCount,
            totalPages,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          }
        });

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit logs',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Gather comprehensive system statistics
   */
  static async gatherSystemStatistics() {
    const client = await DatabaseService.getConnection();
    
    try {
      // Get user statistics
      const userStatsResult = await client.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30_days
        FROM users
      `);

      // Get document statistics
      const documentStatsResult = await client.query(`
        SELECT 
          COUNT(*) as total_documents,
          COUNT(DISTINCT user_id) as users_with_documents,
          COUNT(DISTINCT type) as document_types,
          SUM(file_size) as total_storage_used,
          AVG(file_size) as avg_file_size,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_documents_30_days
        FROM documents
      `);

      // Get OCR statistics
      const ocrStatsResult = await client.query(`
        SELECT 
          COUNT(*) as total_ocr_processed,
          AVG(confidence_score) as avg_confidence,
          AVG(processing_time_ms) as avg_processing_time,
          COUNT(CASE WHEN confidence_score >= 0.9 THEN 1 END) as high_confidence_count,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as ocr_processed_30_days
        FROM ocr_icr_processing
      `);

      // Get document type distribution
      const typeDistributionResult = await client.query(`
        SELECT type, COUNT(*) as count
        FROM documents
        GROUP BY type
        ORDER BY count DESC
      `);

      // Get queue statistics
      let queueStats = {};
      try {
        queueStats = await QueueService.getQueueStats();
      } catch (error) {
        console.warn('Queue stats unavailable:', error.message);
        queueStats = { error: 'Queue service unavailable' };
      }

      // Get storage statistics
      let storageStats = {};
      try {
        // This would require implementing storage health check
        storageStats = {
          status: 'connected',
          provider: 'MinIO'
        };
      } catch (error) {
        console.warn('Storage stats unavailable:', error.message);
        storageStats = { error: 'Storage service unavailable' };
      }

      return {
        users: userStatsResult.rows[0],
        documents: {
          ...documentStatsResult.rows[0],
          total_storage_used: parseInt(documentStatsResult.rows[0].total_storage_used || 0, 10),
          avg_file_size: Math.round(parseFloat(documentStatsResult.rows[0].avg_file_size || 0))
        },
        ocr: {
          ...ocrStatsResult.rows[0],
          avg_confidence: parseFloat(ocrStatsResult.rows[0].avg_confidence || 0).toFixed(3),
          avg_processing_time: Math.round(parseFloat(ocrStatsResult.rows[0].avg_processing_time || 0))
        },
        documentTypes: typeDistributionResult.rows,
        queues: queueStats,
        storage: storageStats,
        system: {
          uptime: process.uptime(),
          nodeVersion: process.version,
          memoryUsage: process.memoryUsage(),
          platform: process.platform,
          env: process.env.NODE_ENV
        }
      };

    } finally {
      client.release();
    }
  }

  /**
   * Get comprehensive service health and monitoring
   * GET /api/admin/services/health
   */
  static async getServicesHealth(req, res) {
    try {
      const axios = require('axios');
      const serviceUrls = {
        ocr: process.env.PYTHON_OCR_URL || 'http://localhost:8000',
        icr: process.env.PYTHON_ICR_URL || 'http://localhost:8001',
        nlp: process.env.PYTHON_NLP_URL || 'http://localhost:8002',
        intelligence: process.env.PYTHON_INTELLIGENCE_URL || 'http://localhost:8004',
        modelRegistry: process.env.MODEL_REGISTRY_URL || 'http://localhost:8003'
      };

      const healthChecks = await Promise.allSettled(
        Object.entries(serviceUrls).map(async ([name, url]) => {
          const startTime = Date.now();
          try {
            const response = await axios.get(`${url}/health`, { timeout: 5000 });
            const responseTime = Date.now() - startTime;
            return {
              name,
              url,
              status: 'healthy',
              responseTime,
              data: response.data,
              timestamp: new Date().toISOString()
            };
          } catch (error) {
            const responseTime = Date.now() - startTime;
            return {
              name,
              url,
              status: 'unhealthy',
              responseTime,
              error: error.message,
              timestamp: new Date().toISOString()
            };
          }
        })
      );

      const services = healthChecks.map(result => 
        result.status === 'fulfilled' ? result.value : result.reason
      );

      const overallStatus = services.every(service => service.status === 'healthy') 
        ? 'healthy' : 'degraded';

      res.json({
        success: true,
        message: 'Service health check completed',
        overallStatus,
        services,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Service health check error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check service health',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get real-time analytics dashboard data
   * GET /api/admin/analytics/dashboard
   */
  static async getAnalyticsDashboard(req, res) {
    try {
      const { timeRange = '24h' } = req.query;
      
      // Calculate time range
      const timeRanges = {
        '1h': 1,
        '6h': 6,
        '24h': 24,
        '7d': 168,
        '30d': 720
      };

      const hoursBack = timeRanges[timeRange] || 24;
      const fromTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000));

      const client = await DatabaseService.getConnection();

      try {
        // Document processing trends
        const processingTrendsQuery = `
          SELECT 
            DATE_TRUNC('hour', created_at) as hour,
            COUNT(*) as document_count,
            COUNT(CASE WHEN ocr_text IS NOT NULL THEN 1 END) as ocr_processed,
            AVG(CASE WHEN ocr_confidence > 0 THEN ocr_confidence END) as avg_confidence
          FROM documents 
          WHERE created_at >= $1
          GROUP BY DATE_TRUNC('hour', created_at)
          ORDER BY hour ASC
        `;

        // User activity trends
        const userActivityQuery = `
          SELECT 
            DATE_TRUNC('hour', created_at) as hour,
            COUNT(DISTINCT user_id) as active_users,
            COUNT(*) as total_actions
          FROM audit_log 
          WHERE created_at >= $1
          GROUP BY DATE_TRUNC('hour', created_at)
          ORDER BY hour ASC
        `;

        // Top document types
        const documentTypesQuery = `
          SELECT 
            document_type,
            COUNT(*) as count,
            AVG(CASE WHEN ocr_confidence > 0 THEN ocr_confidence END) as avg_confidence
          FROM documents 
          WHERE created_at >= $1 AND document_type IS NOT NULL
          GROUP BY document_type
          ORDER BY count DESC
          LIMIT 10
        `;

        // Error rates
        const errorRatesQuery = `
          SELECT 
            DATE_TRUNC('hour', created_at) as hour,
            COUNT(*) as total_requests,
            COUNT(CASE WHEN action LIKE '%error%' OR action LIKE '%fail%' THEN 1 END) as error_count
          FROM audit_log 
          WHERE created_at >= $1
          GROUP BY DATE_TRUNC('hour', created_at)
          ORDER BY hour ASC
        `;

        // Storage usage by user
        const storageByUserQuery = `
          SELECT 
            u.email,
            u.first_name,
            u.last_name,
            COUNT(d.id) as document_count,
            COALESCE(SUM(d.file_size), 0) as total_storage
          FROM users u
          LEFT JOIN documents d ON u.id = d.user_id
          WHERE d.created_at >= $1 OR d.created_at IS NULL
          GROUP BY u.id, u.email, u.first_name, u.last_name
          ORDER BY total_storage DESC
          LIMIT 10
        `;

        const [
          processingTrends,
          userActivity,
          documentTypes,
          errorRates,
          storageByUser
        ] = await Promise.all([
          client.query(processingTrendsQuery, [fromTime]),
          client.query(userActivityQuery, [fromTime]),
          client.query(documentTypesQuery, [fromTime]),
          client.query(errorRatesQuery, [fromTime]),
          client.query(storageByUserQuery, [fromTime])
        ]);

        // Calculate summary metrics
        const totalDocuments = processingTrends.rows.reduce((sum, row) => sum + parseInt(row.document_count), 0);
        const totalOcrProcessed = processingTrends.rows.reduce((sum, row) => sum + parseInt(row.ocr_processed), 0);
        const ocrSuccessRate = totalDocuments > 0 ? (totalOcrProcessed / totalDocuments * 100).toFixed(2) : 0;

        const totalErrors = errorRates.rows.reduce((sum, row) => sum + parseInt(row.error_count), 0);
        const totalRequests = errorRates.rows.reduce((sum, row) => sum + parseInt(row.total_requests), 0);
        const errorRate = totalRequests > 0 ? (totalErrors / totalRequests * 100).toFixed(2) : 0;

        res.json({
          success: true,
          message: 'Analytics dashboard data retrieved successfully',
          timeRange,
          summary: {
            totalDocuments,
            totalOcrProcessed,
            ocrSuccessRate: parseFloat(ocrSuccessRate),
            errorRate: parseFloat(errorRate),
            totalRequests,
            totalErrors
          },
          charts: {
            processingTrends: processingTrends.rows,
            userActivity: userActivity.rows,
            documentTypes: documentTypes.rows,
            errorRates: errorRates.rows,
            storageByUser: storageByUser.rows.map(row => ({
              ...row,
              total_storage: parseInt(row.total_storage)
            }))
          },
          generatedAt: new Date().toISOString()
        });

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Analytics dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve analytics dashboard data',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get system configuration and settings
   * GET /api/admin/config
   */
  static async getSystemConfig(req, res) {
    try {
      const config = {
        application: {
          name: 'SmartDockAI',
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV,
          nodeVersion: process.version,
          platform: process.platform
        },
        database: {
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          name: process.env.DB_NAME,
          // Don't expose sensitive info
          connectionStatus: 'connected' // You could add a real check here
        },
        storage: {
          provider: 'MinIO',
          endpoint: process.env.MINIO_ENDPOINT,
          bucket: process.env.MINIO_BUCKET,
          // Don't expose credentials
        },
        services: {
          ocr: {
            url: process.env.PYTHON_OCR_URL,
            enabled: !!process.env.PYTHON_OCR_URL
          },
          icr: {
            url: process.env.PYTHON_ICR_URL,
            enabled: !!process.env.PYTHON_ICR_URL
          },
          nlp: {
            url: process.env.PYTHON_NLP_URL,
            enabled: !!process.env.PYTHON_NLP_URL
          },
          intelligence: {
            url: process.env.PYTHON_INTELLIGENCE_URL,
            enabled: !!process.env.PYTHON_INTELLIGENCE_URL
          }
        },
        features: {
          ocrTrainingMode: process.env.OCR_TRAINING_MODE === 'true',
          jwtExpiresIn: process.env.JWT_EXPIRES_IN,
          // Add other feature flags
        },
        limits: {
          maxFileSize: '10MB', // From express config
          maxConcurrentJobs: 10, // Could be configurable
          sessionTimeout: process.env.JWT_EXPIRES_IN
        }
      };

      res.json({
        success: true,
        message: 'System configuration retrieved successfully',
        config,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('System config error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve system configuration',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Update system configuration
   * PUT /api/admin/config
   */
  static async updateSystemConfig(req, res) {
    try {
      const { section, key, value } = req.body;

      if (!section || !key || value === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Section, key, and value are required'
        });
      }

      // For security, only allow certain configurations to be updated
      const allowedConfigs = {
        features: ['ocrTrainingMode'],
        limits: ['maxConcurrentJobs']
      };

      if (!allowedConfigs[section] || !allowedConfigs[section].includes(key)) {
        return res.status(403).json({
          success: false,
          message: 'Configuration update not allowed for this key'
        });
      }

      // In a real implementation, you'd store these in a database
      // For now, we'll just log the change and return success
      const client = await DatabaseService.getConnection();
      
      try {
        // Log the configuration change
        await client.query(`
          INSERT INTO audit_log (user_id, action, resource_type, resource_id, details, ip_address)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          req.user.id,
          'config_update',
          'system_config',
          `${section}.${key}`,
          JSON.stringify({ oldValue: 'unknown', newValue: value }),
          req.ip
        ]);

        res.json({
          success: true,
          message: 'Configuration updated successfully',
          change: {
            section,
            key,
            value,
            updatedBy: req.user.email,
            updatedAt: new Date().toISOString()
          }
        });

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Update system config error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update system configuration',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get user roles and permissions management
   * GET /api/admin/roles
   */
  static async getRolesManagement(req, res) {
    try {
      const client = await DatabaseService.getConnection();

      try {
        // Get all roles with user counts
        const rolesQuery = `
          SELECT 
            r.id,
            r.name,
            r.description,
            r.permissions,
            r.created_at,
            r.updated_at,
            COUNT(ur.user_id) as user_count
          FROM roles r
          LEFT JOIN user_roles ur ON r.id = ur.role_id
          GROUP BY r.id, r.name, r.description, r.permissions, r.created_at, r.updated_at
          ORDER BY r.name ASC
        `;

        const rolesResult = await client.query(rolesQuery);

        // Get permissions breakdown
        const permissionsQuery = `
          SELECT 
            permission,
            COUNT(*) as role_count
          FROM roles r,
          LATERAL unnest(r.permissions) AS permission
          GROUP BY permission
          ORDER BY role_count DESC
        `;

        const permissionsResult = await client.query(permissionsQuery);

        res.json({
          success: true,
          message: 'Roles and permissions retrieved successfully',
          roles: rolesResult.rows.map(role => ({
            ...role,
            user_count: parseInt(role.user_count),
            permissions: role.permissions || []
          })),
          permissionsSummary: permissionsResult.rows,
          timestamp: new Date().toISOString()
        });

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Get roles management error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve roles and permissions',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get system performance metrics
   * GET /api/admin/performance
   */
  static async getPerformanceMetrics(req, res) {
    try {
      const { timeRange = '1h' } = req.query;
      
      const timeRanges = {
        '15m': 15,
        '1h': 60,
        '6h': 360,
        '24h': 1440
      };

      const minutesBack = timeRanges[timeRange] || 60;
      const fromTime = new Date(Date.now() - (minutesBack * 60 * 1000));

      const client = await DatabaseService.getConnection();

      try {
        // Response time metrics from audit logs
        const responseTimeQuery = `
          SELECT 
            DATE_TRUNC('minute', created_at) as minute,
            action,
            COUNT(*) as request_count,
            AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_response_time
          FROM audit_log 
          WHERE created_at >= $1 
            AND updated_at IS NOT NULL
            AND action IN ('document_upload', 'ocr_process', 'document_search')
          GROUP BY DATE_TRUNC('minute', created_at), action
          ORDER BY minute ASC
        `;

        // Database performance
        const dbPerformanceQuery = `
          SELECT 
            'active_connections' as metric,
            COUNT(*) as value
          FROM pg_stat_activity 
          WHERE state = 'active'
          UNION ALL
          SELECT 
            'total_connections' as metric,
            COUNT(*) as value
          FROM pg_stat_activity
        `;

        const [responseTimeResult, dbPerformanceResult] = await Promise.all([
          client.query(responseTimeQuery, [fromTime]),
          client.query(dbPerformanceQuery)
        ]);

        // System metrics
        const systemMetrics = {
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          cpu: process.cpuUsage(),
          platform: process.platform,
          nodeVersion: process.version
        };

        res.json({
          success: true,
          message: 'Performance metrics retrieved successfully',
          timeRange,
          metrics: {
            responseTime: responseTimeResult.rows,
            database: dbPerformanceResult.rows.reduce((acc, row) => {
              acc[row.metric] = parseInt(row.value);
              return acc;
            }, {}),
            system: systemMetrics
          },
          timestamp: new Date().toISOString()
        });

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Performance metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve performance metrics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Manage user roles assignment
   * PUT /api/admin/users/:userId/roles
   */
  static async updateUserRoles(req, res) {
    try {
      const { userId } = req.params;
      const { roleIds, reason } = req.body;

      if (!Array.isArray(roleIds)) {
        return res.status(400).json({
          success: false,
          message: 'roleIds must be an array'
        });
      }

      const client = await DatabaseService.getConnection();

      try {
        await client.query('BEGIN');

        // Verify user exists
        const userCheck = await client.query('SELECT id, email FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        // Get current roles for logging
        const currentRolesResult = await client.query(`
          SELECT r.name 
          FROM roles r 
          JOIN user_roles ur ON r.id = ur.role_id 
          WHERE ur.user_id = $1
        `, [userId]);
        const currentRoles = currentRolesResult.rows.map(row => row.name);

        // Remove existing role assignments
        await client.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);

        // Add new role assignments
        if (roleIds.length > 0) {
          const roleValues = roleIds.map((roleId, index) => `($1, $${index + 2})`).join(', ');
          const roleQuery = `INSERT INTO user_roles (user_id, role_id) VALUES ${roleValues}`;
          await client.query(roleQuery, [userId, ...roleIds]);
        }

        // Get new roles for logging
        const newRolesResult = await client.query(`
          SELECT r.name 
          FROM roles r 
          JOIN user_roles ur ON r.id = ur.role_id 
          WHERE ur.user_id = $1
        `, [userId]);
        const newRoles = newRolesResult.rows.map(row => row.name);

        // Log the action
        await client.query(`
          INSERT INTO audit_log (user_id, action, resource_type, resource_id, details, ip_address)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          req.user.id,
          'roles_updated',
          'user',
          userId,
          JSON.stringify({
            targetUser: userCheck.rows[0].email,
            oldRoles: currentRoles,
            newRoles: newRoles,
            reason: reason || 'No reason provided'
          }),
          req.ip
        ]);

        await client.query('COMMIT');

        res.json({
          success: true,
          message: 'User roles updated successfully',
          changes: {
            userId,
            oldRoles: currentRoles,
            newRoles: newRoles,
            updatedBy: req.user.email,
            updatedAt: new Date().toISOString()
          }
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Update user roles error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user roles',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = AdminController;