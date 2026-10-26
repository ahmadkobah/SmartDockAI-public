/**
 * ICR Routes
 * 
 * Defines API endpoints for Intelligent Character Recognition operations
 * Specialized for handwriting recognition, signature detection, and form processing
 */

const express = require('express');
const icrController = require('../controllers/ICRController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /icr/documents/{documentId}/process:
 *   post:
 *     summary: Process handwriting recognition for an existing document
 *     tags: [ICR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/DocumentId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mode:
 *                 type: string
 *                 enum: [handwriting, cursive, print, mixed]
 *                 default: handwriting
 *                 description: ICR processing mode
 *               language:
 *                 type: string
 *                 default: en
 *                 description: Language code for recognition
 *               priority:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 default: 5
 *                 description: Processing priority
 *               options:
 *                 type: object
 *                 description: Additional processing options
 *           example:
 *             mode: "handwriting"
 *             language: "en"
 *             priority: 5
 *             options:
 *               detectSignatures: true
 *               normalizeText: true
 *     responses:
 *       200:
 *         description: ICR processing completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               message: "ICR processing completed successfully"
 *               data:
 *                 documentId: 123
 *                 mode: "handwriting"
 *                 language: "en"
 *                 extractedText: "Dear John, Thank you for your letter..."
 *                 confidence: 0.89
 *                 handwritingRegions: [{"x": 10, "y": 20, "width": 200, "height": 50}]
 *                 signatures: [{"x": 300, "y": 400, "confidence": 0.95}]
 *                 processingTime: 3500
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/documents/:documentId/process', icrController.processDocument);

/**
 * @swagger
 * /icr/upload:
 *   post:
 *     summary: Upload and process file directly with ICR
 *     tags: [ICR]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image or PDF file for ICR processing
 *               mode:
 *                 type: string
 *                 enum: [handwriting, cursive, print, mixed]
 *                 default: handwriting
 *               language:
 *                 type: string
 *                 default: en
 *               filename:
 *                 type: string
 *                 description: Optional custom filename
 *               options:
 *                 type: string
 *                 description: JSON string of additional options
 *     responses:
 *       200:
 *         description: File processed with ICR successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/upload', 
  icrController.upload.single('file'),
  icrController.uploadAndProcess
);

/**
 * @swagger
 * /icr/analyze/handwriting:
 *   post:
 *     summary: Analyze handwriting regions in a document
 *     tags: [ICR]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image file for handwriting analysis
 *               language:
 *                 type: string
 *                 default: en
 *               options:
 *                 type: string
 *                 description: JSON string of analysis options
 *     responses:
 *       200:
 *         description: Handwriting analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               message: "Handwriting analysis completed"
 *               data:
 *                 regions: [{"x": 10, "y": 20, "width": 200, "height": 50, "confidence": 0.92}]
 *                 text: "Sample handwritten text"
 *                 confidence: 0.89
 *                 characteristics:
 *                   style: "cursive"
 *                   pressure: "medium"
 *                   slant: "right"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/analyze/handwriting',
  icrController.upload.single('file'),
  icrController.analyzeHandwriting
);

/**
 * @swagger
 * /icr/signatures/detect:
 *   post:
 *     summary: Detect and verify signatures in a document
 *     tags: [ICR]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image file for signature detection
 *               options:
 *                 type: string
 *                 description: JSON string of detection options
 *     responses:
 *       200:
 *         description: Signature detection completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               message: "Signature detection completed"
 *               data:
 *                 signatures: 
 *                   - x: 300
 *                     y: 400
 *                     width: 150
 *                     height: 60
 *                     confidence: 0.95
 *                     type: "handwritten"
 *                 count: 1
 *                 processingTime: 1200
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/signatures/detect',
  icrController.upload.single('file'),
  icrController.detectSignatures
);

/**
 * @swagger
 * /icr/forms/process:
 *   post:
 *     summary: Process structured forms with handwritten fields
 *     tags: [ICR]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Form image for processing
 *               formType:
 *                 type: string
 *                 enum: [generic, tax, insurance, medical, legal]
 *                 default: generic
 *               language:
 *                 type: string
 *                 default: en
 *               template:
 *                 type: string
 *                 description: JSON string of form template
 *               options:
 *                 type: string
 *                 description: JSON string of processing options
 *     responses:
 *       200:
 *         description: Form processing completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               message: "Form processing completed"
 *               data:
 *                 formType: "tax"
 *                 fields:
 *                   firstName: "John"
 *                   lastName: "Doe"
 *                   ssn: "123-45-6789"
 *                   income: "75000"
 *                 confidence: 0.87
 *                 processingTime: 4200
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/forms/process',
  icrController.upload.single('file'),
  icrController.processForms
);

/**
 * @swagger
 * /icr/forms/templates:
 *   get:
 *     summary: Get available form templates
 *     tags: [ICR]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Form templates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               message: "Form templates retrieved successfully"
 *               data:
 *                 templates:
 *                   - id: "tax-1040"
 *                     name: "IRS Form 1040"
 *                     type: "tax"
 *                     fields: ["firstName", "lastName", "ssn", "income"]
 *                   - id: "insurance-claim"
 *                     name: "Insurance Claim Form"
 *                     type: "insurance"
 *                     fields: ["claimantName", "policyNumber", "incidentDate"]
 *                 count: 2
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/forms/templates', icrController.getFormTemplates);

/**
 * @swagger
 * /icr/capabilities:
 *   get:
 *     summary: Get ICR service capabilities and configuration
 *     tags: [ICR]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ICR capabilities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               message: "ICR capabilities retrieved successfully"
 *               data:
 *                 handwritingRecognition:
 *                   supported: true
 *                   languages: ["en", "es", "fr", "de"]
 *                   modes: ["handwriting", "cursive", "print", "mixed"]
 *                 signatureDetection:
 *                   supported: true
 *                   features: ["detection", "verification", "matching"]
 *                 formProcessing:
 *                   supported: true
 *                   types: ["generic", "tax", "insurance", "medical", "legal"]
 *                 supportedFormats: ["image/jpeg", "image/png", "image/tiff", "image/bmp", "application/pdf"]
 *                 maxFileSize: "50MB"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/capabilities', icrController.getCapabilities);

/**
 * @swagger
 * /icr/health:
 *   get:
 *     summary: Get ICR service health and status
 *     tags: [ICR]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ICR service health retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               message: "ICR service health retrieved successfully"
 *               data:
 *                 health:
 *                   status: "healthy"
 *                   responseTime: 145
 *                   uptime: "7d 12h 30m"
 *                 serviceInfo:
 *                   version: "1.0.0"
 *                   capabilities: ["handwriting", "signatures", "forms"]
 *                 timestamp: "2025-10-16T12:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/health', icrController.getHealth);

/**
 * @swagger
 * /icr/batch:
 *   post:
 *     summary: Batch process multiple documents with ICR
 *     tags: [ICR]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Multiple files for batch processing
 *               mode:
 *                 type: string
 *                 enum: [handwriting, cursive, print, mixed]
 *                 default: handwriting
 *               language:
 *                 type: string
 *                 default: en
 *               options:
 *                 type: string
 *                 description: JSON string of processing options
 *     responses:
 *       200:
 *         description: Batch ICR processing completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               message: "Batch ICR processing completed"
 *               data:
 *                 processed: 5
 *                 successful: 4
 *                 failed: 1
 *                 results:
 *                   - filename: "handwriting1.jpg"
 *                     success: true
 *                     data: {"extractedText": "Sample text", "confidence": 0.89}
 *                   - filename: "handwriting2.jpg"
 *                     success: false
 *                     error: "File format not supported"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/batch',
  icrController.upload.array('files', 10),
  icrController.batchProcess
);

// Admin-only routes
/**
 * @swagger
 * /icr/admin/statistics:
 *   get:
 *     summary: Get ICR processing statistics (Admin only)
 *     tags: [ICR]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ICR statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               message: "ICR statistics retrieved successfully"
 *               data:
 *                 totalProcessed: 1250
 *                 averageConfidence: 0.87
 *                 averageProcessingTime: 3200
 *                 handwritingAccuracy: 0.89
 *                 signatureDetectionRate: 0.94
 *                 formProcessingSuccess: 0.92
 *                 languageDistribution:
 *                   en: 800
 *                   es: 250
 *                   fr: 150
 *                   de: 50
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/admin/statistics',
  authorize(['admin']),
  icrController.getStatistics
);

module.exports = router;