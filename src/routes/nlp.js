/**
 * NLP Routes
 * 
 * Defines API endpoints for Natural Language Processing operations
 */

const express = require('express');
const router = express.Router();
const nlpController = require('../controllers/NLPController');
const { authenticate } = require('../middleware/auth');

// Middleware for all NLP routes
router.use(authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     NLPTextRequest:
 *       type: object
 *       required:
 *         - text
 *       properties:
 *         text:
 *           type: string
 *           description: Text to analyze
 *         language:
 *           type: string
 *           description: Language code (auto-detect if not specified)
 *           default: auto
 *     
 *     SentimentResult:
 *       type: object
 *       properties:
 *         label:
 *           type: string
 *           enum: [positive, negative, neutral]
 *         score:
 *           type: number
 *           minimum: -1
 *           maximum: 1
 *         confidence:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *     
 *     Entity:
 *       type: object
 *       properties:
 *         text:
 *           type: string
 *         label:
 *           type: string
 *         start:
 *           type: integer
 *         end:
 *           type: integer
 *         confidence:
 *           type: number
 *     
 *     Keyword:
 *       type: object
 *       properties:
 *         keyword:
 *           type: string
 *         score:
 *           type: number
 *         frequency:
 *           type: integer
 */

/**
 * @swagger
 * /api/nlp/health:
 *   get:
 *     summary: Check NLP service health
 *     tags: [NLP]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *       503:
 *         description: Service is unhealthy
 */
router.get('/health', nlpController.healthCheck);

/**
 * @swagger
 * /api/nlp/info:
 *   get:
 *     summary: Get NLP service information
 *     tags: [NLP]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Service information retrieved successfully
 */
router.get('/info', nlpController.getServiceInfo);

/**
 * @swagger
 * /api/nlp/models:
 *   get:
 *     summary: Get model information
 *     tags: [NLP]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Model information retrieved successfully
 */
router.get('/models', nlpController.getModelInfo);

/**
 * @swagger
 * /api/nlp/analyze/sentiment:
 *   post:
 *     summary: Analyze text sentiment
 *     tags: [NLP]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/NLPTextRequest'
 *               - type: object
 *                 properties:
 *                   includeDetails:
 *                     type: boolean
 *                     default: true
 *     responses:
 *       200:
 *         description: Sentiment analysis completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     sentiment:
 *                       $ref: '#/components/schemas/SentimentResult'
 */
router.post('/analyze/sentiment', nlpController.analyzeSentiment);

/**
 * @swagger
 * /api/nlp/analyze/entities:
 *   post:
 *     summary: Extract named entities from text
 *     tags: [NLP]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/NLPTextRequest'
 *               - type: object
 *                 properties:
 *                   entityTypes:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: Filter by specific entity types
 *     responses:
 *       200:
 *         description: Entity extraction completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     entities:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Entity'
 */
router.post('/analyze/entities', nlpController.extractEntities);

/**
 * @swagger
 * /api/nlp/analyze/keywords:
 *   post:
 *     summary: Extract keywords from text
 *     tags: [NLP]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/NLPTextRequest'
 *               - type: object
 *                 properties:
 *                   maxKeywords:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 50
 *                     default: 10
 *                   minScore:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *                     default: 0.1
 *     responses:
 *       200:
 *         description: Keyword extraction completed successfully
 */
router.post('/analyze/keywords', nlpController.extractKeywords);

/**
 * @swagger
 * /api/nlp/analyze/summarize:
 *   post:
 *     summary: Summarize text content
 *     tags: [NLP]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/NLPTextRequest'
 *               - type: object
 *                 properties:
 *                   maxLength:
 *                     type: integer
 *                     minimum: 50
 *                     maximum: 500
 *                     default: 150
 *                   minLength:
 *                     type: integer
 *                     minimum: 10
 *                     maximum: 200
 *                     default: 50
 *     responses:
 *       200:
 *         description: Text summarization completed successfully
 */
router.post('/analyze/summarize', nlpController.summarizeText);

/**
 * @swagger
 * /api/nlp/analyze/language:
 *   post:
 *     summary: Detect text language
 *     tags: [NLP]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Language detection completed successfully
 */
router.post('/analyze/language', nlpController.detectLanguage);

/**
 * @swagger
 * /api/nlp/analyze/classify:
 *   post:
 *     summary: Classify text into categories
 *     tags: [NLP]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/NLPTextRequest'
 *               - type: object
 *                 properties:
 *                   categories:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: Custom categories for classification
 *     responses:
 *       200:
 *         description: Text classification completed successfully
 */
router.post('/analyze/classify', nlpController.classifyText);

/**
 * @swagger
 * /api/nlp/analyze/similarity:
 *   post:
 *     summary: Calculate semantic similarity between texts
 *     tags: [NLP]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text1
 *               - text2
 *             properties:
 *               text1:
 *                 type: string
 *               text2:
 *                 type: string
 *               language:
 *                 type: string
 *                 default: auto
 *     responses:
 *       200:
 *         description: Similarity calculation completed successfully
 */
router.post('/analyze/similarity', nlpController.calculateSimilarity);

/**
 * @swagger
 * /api/nlp/analyze/batch:
 *   post:
 *     summary: Analyze multiple texts in batch
 *     tags: [NLP]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - texts
 *               - task
 *             properties:
 *               texts:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 100
 *               task:
 *                 type: string
 *                 enum: [sentiment, entities, keywords, language, classify]
 *               language:
 *                 type: string
 *                 default: auto
 *               parameters:
 *                 type: object
 *                 description: Task-specific parameters
 *     responses:
 *       200:
 *         description: Batch analysis completed successfully
 */
router.post('/analyze/batch', nlpController.batchAnalyze);

/**
 * @swagger
 * /api/nlp/analyze/document:
 *   post:
 *     summary: Comprehensive document analysis
 *     tags: [NLP]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/NLPTextRequest'
 *               - type: object
 *                 properties:
 *                   entityTypes:
 *                     type: array
 *                     items:
 *                       type: string
 *                   maxKeywords:
 *                     type: integer
 *                     default: 10
 *                   minScore:
 *                     type: number
 *                     default: 0.2
 *                   categories:
 *                     type: array
 *                     items:
 *                       type: string
 *                   includeSummary:
 *                     type: boolean
 *                     default: true
 *     responses:
 *       200:
 *         description: Document analysis completed successfully
 */
router.post('/analyze/document', nlpController.analyzeDocument);

/**
 * @swagger
 * /api/nlp/process-document:
 *   post:
 *     summary: Process document content for pipeline integration
 *     tags: [NLP]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentId
 *               - extractedText
 *             properties:
 *               documentId:
 *                 type: string
 *               extractedText:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Document processing completed successfully
 */
router.post('/process-document', nlpController.processDocumentContent);

module.exports = router;