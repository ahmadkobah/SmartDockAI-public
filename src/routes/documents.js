const express = require('express');
const { Op } = require('sequelize');
const { Document } = require('../models');
const documentController = require('../controllers/DocumentController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /documents/upload:
 *   post:
 *     summary: Upload a single document for processing
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - document
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: Document file to upload (PDF, PNG, JPG, JPEG, TIFF)
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional tags for the document
 *                 example: ["invoice", "2025", "acme-corp"]
 *               metadata:
 *                 type: object
 *                 description: Optional metadata for the document
 *                 example:
 *                   department: "Finance"
 *                   project: "Q4-2025"
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               $ref: '#/components/examples/DocumentUploadResponse'
 *       400:
 *         description: Invalid file or request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Invalid file format. Supported formats: PDF, PNG, JPG, JPEG, TIFF"
 *               code: "INVALID_FILE_FORMAT"
 *               timestamp: "2025-10-16T12:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       413:
 *         description: File too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "File size exceeds maximum limit of 50MB"
 *               code: "FILE_TOO_LARGE"
 *               timestamp: "2025-10-16T12:00:00.000Z"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/upload', 
  documentController.upload.single('document'),
  documentController.uploadDocument
);

/**
 * @swagger
 * /documents/upload-multiple:
 *   post:
 *     summary: Upload multiple documents for batch processing
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - documents
 *             properties:
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Multiple document files (max 10 files)
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional tags to apply to all documents
 *     responses:
 *       201:
 *         description: Documents uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               message: "Multiple documents uploaded successfully"
 *               data:
 *                 uploaded: 3
 *                 failed: 0
 *                 documents:
 *                   - id: 123
 *                     filename: "invoice1.pdf"
 *                     status: "processing"
 *                   - id: 124
 *                     filename: "invoice2.pdf"
 *                     status: "processing"
 *                   - id: 125
 *                     filename: "contract.pdf"
 *                     status: "processing"
 *               timestamp: "2025-10-16T12:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/upload-multiple',
  documentController.upload.array('documents', 10),
  documentController.uploadMultipleDocuments
);

/**
 * @route   GET /api/documents
 * @desc    Get user's documents with pagination and filtering
 * @access  Private (authenticated users)
 * @query   page (number) - Page number (default: 1)
 * @query   limit (number) - Items per page (default: 20, max: 100)
 * @query   search (string) - Search in filename and OCR text
 * @query   mimeType (string) - Filter by MIME type
 * @query   tags (string|array) - Filter by tags (comma-separated)
 * @query   sortBy (string) - Sort field (default: createdAt)
 * @query   sortOrder (string) - Sort order: ASC|DESC (default: DESC)
 */
router.get('/', documentController.getDocuments);

/**
 * @route   GET /api/documents/:id
 * @desc    Get document details by ID
 * @access  Private (authenticated users - own documents only)
 */
router.get('/:id', documentController.getDocument);

/**
 * @route   GET /api/documents/:id/download
 * @desc    Download a document file
 * @access  Private (authenticated users for own docs, public for public docs)
 */
router.get('/:id/download', documentController.downloadDocument);

/**
 * @route   PUT /api/documents/:id
 * @desc    Update document metadata, tags, and visibility
 * @access  Private (authenticated users - own documents only)
 */
router.put('/:id', documentController.updateDocument);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete a document and its file
 * @access  Private (authenticated users - own documents only)
 */
router.delete('/:id', documentController.deleteDocument);

// Admin-only routes for managing all documents
/**
 * @route   GET /api/documents/admin/all
 * @desc    Get all documents (admin only)
 * @access  Private (admin only)
 */
router.get('/admin/all', 
  authorize(['admin']),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        mimeType,
        userId,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const where = {};

      if (search) {
        where[Op.or] = [
          { originalName: { [Op.iLike]: `%${search}%` } },
          { ocrText: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (mimeType) {
        where.mimeType = mimeType;
      }

      if (userId) {
        where.uploadedBy = userId;
      }

      const { count, rows: documents } = await Document.findAndCountAll({
        where,
        limit: parseInt(limit, 10),
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        include: [
          {
            model: require('../models').User,
            as: 'uploader',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      const totalPages = Math.ceil(count / parseInt(limit, 10));

      res.json({
        documents: documents.map(doc => ({
          id: doc.id,
          filename: doc.originalName,
          size: doc.size,
          mimeType: doc.mimeType,
          uploadedAt: doc.createdAt,
          uploader: doc.uploader,
          tags: doc.tags,
          isPublic: doc.isPublic,
          downloadCount: doc.downloadCount,
          ocrStatus: doc.ocrStatus,
          downloadUrl: `/api/documents/${doc.id}/download`
        })),
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: count,
          totalPages,
          hasNext: parseInt(page, 10) < totalPages,
          hasPrev: parseInt(page, 10) > 1
        }
      });
    } catch (error) {
      console.error('Admin get all documents error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve documents'
      });
    }
  }
);

/**
 * @route   DELETE /api/documents/admin/:id
 * @desc    Delete any document (admin only)
 * @access  Private (admin only)
 */
router.delete('/admin/:id',
  authorize(['admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { Document, AuditLog } = require('../models');
      const storageService = require('../services/StorageService');

      const document = await Document.findByPk(id, {
        include: [
          {
            model: require('../models').User,
            as: 'uploader',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      if (!document) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Document not found'
        });
      }

      // Connect to storage if not connected
      if (!storageService.isConnected) {
        await storageService.connect();
      }

      // Delete file from storage
      await storageService.deleteFile(document.storageKey);

      // Delete document record from database
      await document.destroy();

      // Log admin deletion action
      await AuditLog.logUserAction(req.user, 'admin_delete', 'document', {
        documentId: document.id,
        filename: document.originalName,
        originalUploader: document.uploader,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Document deleted successfully by admin'
      });
    } catch (error) {
      console.error('Admin delete document error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete document'
      });
    }
  }
);

module.exports = router;