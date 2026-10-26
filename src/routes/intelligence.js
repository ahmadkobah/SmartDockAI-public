/**
 * Document Intelligence Routes
 * 
 * Routes for advanced document understanding and intelligence analysis.
 * Integrates with Python Document Intelligence microservice for ML-based
 * document processing, classification, extraction, and routing.
 */

const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const DocumentIntelligenceController = require('../controllers/DocumentIntelligenceController');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
    },
    fileFilter: (req, file, cb) => {
        // Allow all file types for intelligence analysis
        const allowedTypes = [
            'text/plain',
            'text/csv',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'image/tiff',
            'image/bmp',
            'image/gif'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} not supported for intelligence analysis`), false);
        }
    }
});

/**
 * @swagger
 * /api/intelligence/analyze:
 *   post:
 *     summary: Comprehensive document intelligence analysis
 *     tags: [Document Intelligence]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Document text content
 *               filename:
 *                 type: string
 *                 description: Original filename
 *               metadata:
 *                 type: object
 *                 description: Additional document metadata
 *     responses:
 *       200:
 *         description: Analysis completed successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Analysis failed
 */
router.post('/analyze', authenticate, DocumentIntelligenceController.analyzeDocument);

/**
 * @swagger
 * /api/intelligence/upload:
 *   post:
 *     summary: Upload and analyze document file
 *     tags: [Document Intelligence]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Document file to analyze
 *               analysisType:
 *                 type: string
 *                 enum: [full, classification]
 *                 default: full
 *                 description: Type of analysis to perform
 *               confidenceThreshold:
 *                 type: number
 *                 default: 0.8
 *                 description: Minimum confidence threshold
 *     responses:
 *       200:
 *         description: File analysis completed successfully
 *       400:
 *         description: No file uploaded or invalid request
 *       500:
 *         description: Analysis failed
 */
router.post('/upload', authenticate, upload.single('file'), DocumentIntelligenceController.analyzeUploadedFile);

/**
 * @swagger
 * /api/intelligence/classify:
 *   post:
 *     summary: Document classification only
 *     tags: [Document Intelligence]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Document text content
 *               filename:
 *                 type: string
 *                 description: Original filename
 *               metadata:
 *                 type: object
 *                 description: Additional document metadata
 *               confidenceThreshold:
 *                 type: number
 *                 default: 0.8
 *                 description: Minimum confidence threshold
 *               returnAllPredictions:
 *                 type: boolean
 *                 default: false
 *                 description: Return all predictions or top one
 *     responses:
 *       200:
 *         description: Classification completed successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Classification failed
 */
router.post('/classify', authenticate, DocumentIntelligenceController.classifyDocument);

/**
 * @swagger
 * /api/intelligence/extract:
 *   post:
 *     summary: Extract entities from document
 *     tags: [Document Intelligence]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Document text content
 *               filename:
 *                 type: string
 *                 description: Original filename
 *               metadata:
 *                 type: object
 *                 description: Additional document metadata
 *               extractionTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Specific entity types to extract
 *               customPatterns:
 *                 type: object
 *                 description: Custom regex patterns for extraction
 *     responses:
 *       200:
 *         description: Entity extraction completed successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Extraction failed
 */
router.post('/extract', authenticate, DocumentIntelligenceController.extractEntities);

/**
 * @swagger
 * /api/intelligence/templates/match:
 *   post:
 *     summary: Match document against templates
 *     tags: [Document Intelligence]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Document text content
 *               filename:
 *                 type: string
 *                 description: Original filename
 *               metadata:
 *                 type: object
 *                 description: Additional document metadata
 *               templateIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Specific template IDs to match against
 *               similarityThreshold:
 *                 type: number
 *                 default: 0.85
 *                 description: Minimum similarity threshold
 *     responses:
 *       200:
 *         description: Template matching completed successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Template matching failed
 */
router.post('/templates/match', authenticate, DocumentIntelligenceController.matchTemplates);

/**
 * @swagger
 * /api/intelligence/validate:
 *   post:
 *     summary: Validate document against business rules
 *     tags: [Document Intelligence]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Document text content
 *               filename:
 *                 type: string
 *                 description: Original filename
 *               metadata:
 *                 type: object
 *                 description: Additional document metadata
 *               documentType:
 *                 type: string
 *                 description: Document type for validation
 *               validationRules:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Specific validation rules to apply
 *     responses:
 *       200:
 *         description: Document validation completed successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Validation failed
 */
router.post('/validate', authenticate, DocumentIntelligenceController.validateDocument);

/**
 * @swagger
 * /api/intelligence/route:
 *   post:
 *     summary: Get document routing recommendations
 *     tags: [Document Intelligence]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Document text content
 *               filename:
 *                 type: string
 *                 description: Original filename
 *               metadata:
 *                 type: object
 *                 description: Additional document metadata
 *               classificationResult:
 *                 type: object
 *                 description: Pre-computed classification result
 *               routingCriteria:
 *                 type: object
 *                 description: Custom routing criteria
 *     responses:
 *       200:
 *         description: Document routing completed successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Routing failed
 */
router.post('/route', authenticate, DocumentIntelligenceController.routeDocument);

/**
 * @swagger
 * /api/intelligence/health:
 *   get:
 *     summary: Get Document Intelligence service health status
 *     tags: [Document Intelligence]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *       503:
 *         description: Service is unavailable
 */
router.get('/health', authenticate, DocumentIntelligenceController.getHealthStatus);

/**
 * @swagger
 * /api/intelligence/analytics:
 *   get:
 *     summary: Get Document Intelligence service analytics
 *     tags: [Document Intelligence]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *       500:
 *         description: Failed to retrieve analytics
 */
router.get('/analytics', authenticate, DocumentIntelligenceController.getAnalytics);

module.exports = router;
