const express = require('express');
const AdminController = require('../controllers/AdminController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Apply admin authorization to all routes
router.use(authorize(['admin']));

/**
 * @swagger
 * /admin/statistics:
 *   get:
 *     summary: Get comprehensive system statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               message: "System statistics retrieved successfully"
 *               data:
 *                 totalUsers: 1547
 *                 activeUsers: 1489
 *                 totalDocuments: 25847
 *                 documentsProcessedToday: 234
 *                 averageProcessingTime: 3200
 *                 systemUptime: "7d 12h 30m"
 *                 storageUsed: "2.4 GB"
 *                 availableStorage: "97.6 GB"
 *               timestamp: "2025-10-16T12:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/statistics', AdminController.getSystemStatistics);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users with detailed information
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: search
 *         in: query
 *         description: Search in name or email
 *         schema:
 *           type: string
 *         example: "john"
 *       - name: role
 *         in: query
 *         description: Filter by role
 *         schema:
 *           type: string
 *           enum: [admin, user, moderator]
 *         example: "admin"
 *       - name: status
 *         in: query
 *         description: Filter by status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         example: "active"
 *       - name: sortBy
 *         in: query
 *         description: Sort field
 *         schema:
 *           type: string
 *           enum: [created_at, email, first_name, last_name]
 *           default: created_at
 *         example: "email"
 *       - name: sortOrder
 *         in: query
 *         description: Sort order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         example: "asc"
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               message: "Users retrieved successfully"
 *               data:
 *                 users:
 *                   - id: 123
 *                     username: "johndoe"
 *                     email: "john@example.com"
 *                     firstName: "John"
 *                     lastName: "Doe"
 *                     isActive: true
 *                     roles: ["user"]
 *                     lastLogin: "2025-10-16T12:00:00.000Z"
 *                     createdAt: "2025-10-01T12:00:00.000Z"
 *                 pagination:
 *                   page: 1
 *                   limit: 20
 *                   total: 1547
 *                   totalPages: 78
 *               timestamp: "2025-10-16T12:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/users', AdminController.getUsers);

/**
 * @route   PUT /api/admin/users/:userId/status
 * @desc    Update user status (activate/deactivate)
 * @access  Private (admin only)
 * @param   {string} userId - User ID
 * @body    {boolean} isActive - New status
 * @body    {string} reason - Reason for status change
 */
router.put('/users/:userId/status', AdminController.updateUserStatus);

/**
 * @route   GET /api/admin/documents
 * @desc    Get all documents with admin-level details
 * @access  Private (admin only)
 * @param   {number} page - Page number (default: 1)
 * @param   {number} limit - Results per page (default: 20, max: 100)
 * @param   {string} search - Search in title, description, or filename
 * @param   {string} type - Filter by document type
 * @param   {string} userId - Filter by user ID
 * @param   {string} hasOcr - Filter by OCR status (true/false)
 * @param   {string} sortBy - Sort field
 * @param   {string} sortOrder - Sort order (asc/desc)
 */
router.get('/documents', AdminController.getDocuments);

/**
 * @route   DELETE /api/admin/documents/:documentId
 * @desc    Delete document (admin override)
 * @access  Private (admin only)
 * @param   {string} documentId - Document ID
 * @body    {string} reason - Reason for deletion
 */
router.delete('/documents/:documentId', AdminController.deleteDocument);

/**
 * @route   GET /api/admin/health
 * @desc    Get system health and status
 * @access  Private (admin only)
 */
router.get('/health', AdminController.getSystemHealth);

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get audit logs with filtering
 * @access  Private (admin only)
 * @param   {number} page - Page number (default: 1)
 * @param   {number} limit - Results per page (default: 50, max: 200)
 * @param   {string} userId - Filter by user ID
 * @param   {string} action - Filter by action type
 * @param   {string} resourceType - Filter by resource type
 * @param   {string} dateFrom - Start date filter (ISO format)
 * @param   {string} dateTo - End date filter (ISO format)
 */
router.get('/audit-logs', AdminController.getAuditLogs);

/**
 * @swagger
 * /admin/services/health:
 *   get:
 *     summary: Get comprehensive service health monitoring
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Service health status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               $ref: '#/components/examples/ServiceHealthResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/services/health', AdminController.getServicesHealth);

/**
 * @swagger
 * /admin/analytics/dashboard:
 *   get:
 *     summary: Get real-time analytics dashboard data
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: timeRange
 *         in: query
 *         description: Time range for analytics data
 *         schema:
 *           type: string
 *           enum: [1h, 6h, 24h, 7d, 30d]
 *           default: 24h
 *         example: "7d"
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               $ref: '#/components/examples/AdminAnalyticsResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/analytics/dashboard', AdminController.getAnalyticsDashboard);

/**
 * @route   GET /api/admin/config
 * @desc    Get system configuration and settings
 * @access  Private (admin only)
 */
router.get('/config', AdminController.getSystemConfig);

/**
 * @route   PUT /api/admin/config
 * @desc    Update system configuration
 * @access  Private (admin only)
 * @body    {string} section - Configuration section
 * @body    {string} key - Configuration key
 * @body    {any} value - New value
 */
router.put('/config', AdminController.updateSystemConfig);

/**
 * @route   GET /api/admin/roles
 * @desc    Get user roles and permissions management
 * @access  Private (admin only)
 */
router.get('/roles', AdminController.getRolesManagement);

/**
 * @route   GET /api/admin/performance
 * @desc    Get system performance metrics
 * @access  Private (admin only)
 * @param   {string} timeRange - Time range (15m, 1h, 6h, 24h)
 */
router.get('/performance', AdminController.getPerformanceMetrics);

/**
 * @route   PUT /api/admin/users/:userId/roles
 * @desc    Update user role assignments
 * @access  Private (admin only)
 * @param   {string} userId - User ID
 * @body    {array} roleIds - Array of role IDs to assign
 * @body    {string} reason - Reason for role change
 */
router.put('/users/:userId/roles', AdminController.updateUserRoles);

module.exports = router;