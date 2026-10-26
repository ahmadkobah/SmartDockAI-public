const express = require('express');
const authController = require('../controllers/AuthController');
const { authenticate, rateLimitByUser } = require('../middleware/auth');

const router = express.Router();

// Apply rate limiting to all auth routes
router.use(rateLimitByUser(20, 15 * 60 * 1000)); // 20 requests per 15 minutes

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 description: Unique username
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: User password
 *               firstName:
 *                 type: string
 *                 maxLength: 100
 *                 description: User first name
 *               lastName:
 *                 type: string
 *                 maxLength: 100
 *                 description: User last name
 *           example:
 *             $ref: '#/components/examples/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               message: "User registered successfully"
 *               data:
 *                 id: 123
 *                 username: "johndoe"
 *                 email: "john@example.com"
 *                 token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               timestamp: "2025-10-16T12:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "User with this email already exists"
 *               code: "USER_EXISTS"
 *               timestamp: "2025-10-16T12:00:00.000Z"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user and get access token
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *               password:
 *                 type: string
 *                 description: User password
 *           example:
 *             $ref: '#/components/examples/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               message: "Login successful"
 *               data:
 *                 user:
 *                   id: 123
 *                   username: "johndoe"
 *                   email: "john@example.com"
 *                 token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               timestamp: "2025-10-16T12:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Invalid email or password"
 *               code: "INVALID_CREDENTIALS"
 *               timestamp: "2025-10-16T12:00:00.000Z"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/login', (req, res, next) => {
  console.log('🔍 [ROUTE] Login route hit with body:', req.body);
  authController.login(req, res, next);
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token
 *           example:
 *             refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               message: "Token refreshed successfully"
 *               data:
 *                 token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               timestamp: "2025-10-16T12:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Invalid or expired refresh token"
 *               code: "INVALID_REFRESH_TOKEN"
 *               timestamp: "2025-10-16T12:00:00.000Z"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/refresh', authController.refreshToken);

// Protected routes
router.use(authenticate); // Apply authentication middleware to all routes below

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user and invalidate token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               message: "Logout successful"
 *               timestamp: "2025-10-16T12:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get user profile information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               message: "Profile retrieved successfully"
 *               data:
 *                 id: 123
 *                 username: "johndoe"
 *                 email: "john@example.com"
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 isActive: true
 *                 createdAt: "2025-10-01T12:00:00.000Z"
 *                 updatedAt: "2025-10-16T12:00:00.000Z"
 *               timestamp: "2025-10-16T12:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/profile', authController.getProfile);

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: Update user profile information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 maxLength: 100
 *                 description: User first name
 *               lastName:
 *                 type: string
 *                 maxLength: 100
 *                 description: User last name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *           example:
 *             firstName: "John"
 *             lastName: "Doe"
 *             email: "john.doe@example.com"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               message: "Profile updated successfully"
 *               data:
 *                 id: 123
 *                 username: "johndoe"
 *                 email: "john.doe@example.com"
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 updatedAt: "2025-10-16T12:00:00.000Z"
 *               timestamp: "2025-10-16T12:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/profile', authController.updateProfile);

/**
 * @swagger
 * /auth/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Current password
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: New password
 *           example:
 *             currentPassword: "oldPassword123"
 *             newPassword: "newSecurePassword456"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               message: "Password changed successfully"
 *               timestamp: "2025-10-16T12:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid current password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Current password is incorrect"
 *               code: "INVALID_PASSWORD"
 *               timestamp: "2025-10-16T12:00:00.000Z"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/change-password', authController.changePassword);

module.exports = router;