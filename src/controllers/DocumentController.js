const multer = require('multer');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { Document, AuditLog } = require('../models');
const storageService = require('../services/StorageService');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 10 // Max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Basic file type validation (additional validation in controller)
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/tiff'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
});

class DocumentController {
  constructor() {
    this.upload = upload;
  }

  async uploadDocument(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'No file provided'
        });
      }

      const file = req.file;
      const userId = req.user.id;

      // Validate file type
      if (!storageService.validateFileType(file.mimetype)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: `Unsupported file type: ${file.mimetype}`
        });
      }

      // Validate file size
      if (!storageService.validateFileSize(file.size)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'File size exceeds the maximum allowed limit'
        });
      }

      // Generate storage key
      const storageKey = storageService.generateStorageKey(file.originalname, userId);

      // Calculate file checksum
      const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

      console.log('📤 Uploading file to GCS:', { storageKey, size: file.size, type: file.mimetype });

      // Upload file to Google Cloud Storage
      const uploadResult = await storageService.uploadFile(file.buffer, storageKey, {
        mimeType: file.mimetype,
        userId,
        originalName: file.originalname
      });

      console.log('✅ GCS Upload successful:', uploadResult);

      // Extract metadata from request body
      const { tags = [], isPublic = false, metadata = {} } = req.body;
      const parsedTags = Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : []);

      // Create document record in database
      const document = await Document.create({
        filename: storageKey.split('/').pop(),
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedBy: userId,
        storageKey,
        bucket: uploadResult.bucket || process.env.GCS_BUCKET, // Fallback to env variable
        checksum,
        metadata: metadata || {},
        tags: parsedTags,
        isPublic: Boolean(isPublic)
      });

      console.log('✅ Document saved to database:', document.id);

      // Log the upload action
      await AuditLog.logUserAction(req.user, 'upload', 'document', {
        documentId: document.id,
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        message: 'Document uploaded successfully',
        document: {
          id: document.id,
          filename: document.originalName,
          size: document.size,
          mimeType: document.mimeType,
          uploadedAt: document.createdAt,
          tags: document.tags,
          isPublic: document.isPublic,
          downloadUrl: `/api/documents/${document.id}/download`
        }
      });
    } catch (error) {
      console.error('❌ Document upload error:', error);
      
      // Handle specific Google Cloud Storage errors
      if (error.code === 'ENOENT') {
        return res.status(500).json({
          error: 'Storage Error',
          message: 'Google Cloud Storage credentials not found'
        });
      }
      
      if (error.code === 'EACCES' || error.message.includes('permission')) {
        return res.status(500).json({
          error: 'Storage Error', 
          message: 'Insufficient permissions for Google Cloud Storage'
        });
      }

      // Handle multer errors
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'Validation Error',
            message: 'File size exceeds the maximum allowed limit'
          });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            error: 'Validation Error',
            message: 'Too many files. Maximum 10 files allowed per request'
          });
        }
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to upload document',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async uploadMultipleDocuments(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'No files provided'
        });
      }

      const files = req.files;
      const userId = req.user.id;
      const uploadResults = [];
      const errors = [];

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          // Validate file type and size
          if (!storageService.validateFileType(file.mimetype)) {
            errors.push({
              filename: file.originalname,
              error: `Unsupported file type: ${file.mimetype}`
            });
            continue;
          }

          if (!storageService.validateFileSize(file.size)) {
            errors.push({
              filename: file.originalname,
              error: 'File size exceeds the maximum allowed limit'
            });
            continue;
          }

          // Generate storage key and upload
          const storageKey = storageService.generateStorageKey(file.originalname, userId);
          const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

          const uploadResult = await storageService.uploadFile(file.buffer, storageKey, {
            mimeType: file.mimetype,
            userId,
            originalName: file.originalname
          });

          // Create document record
          const document = await Document.create({
            filename: storageKey.split('/').pop(),
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            uploadedBy: userId,
            storageKey,
            bucket: uploadResult.bucket || process.env.GCS_BUCKET,
            checksum,
            metadata: {},
            tags: [],
            isPublic: false
          });

          uploadResults.push({
            id: document.id,
            filename: document.originalName,
            size: document.size,
            mimeType: document.mimeType,
            uploadedAt: document.createdAt,
            downloadUrl: `/api/documents/${document.id}/download`
          });

          // Log each upload
          await AuditLog.logUserAction(req.user, 'upload', 'document', {
            documentId: document.id,
            filename: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
            batchUpload: true,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });
        } catch (fileError) {
          console.error(`Error uploading file ${file.originalname}:`, fileError);
          errors.push({
            filename: file.originalname,
            error: 'Upload failed'
          });
        }
      }

      const response = {
        message: `${uploadResults.length} documents uploaded successfully`,
        documents: uploadResults
      };

      if (errors.length > 0) {
        response.errors = errors;
        response.message += `, ${errors.length} failed`;
      }

      const statusCode = uploadResults.length > 0 ? 201 : 400;
      res.status(statusCode).json(response);
    } catch (error) {
      console.error('Multiple document upload error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to upload documents'
      });
    }
  }

  async getDocuments(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        search,
        mimeType,
        tags,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const where = { uploadedBy: userId };

      // Add search filter
      if (search) {
        where[Op.or] = [
          { originalName: { [Op.iLike]: `%${search}%` } },
          { ocrText: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Add mime type filter
      if (mimeType) {
        where.mimeType = mimeType;
      }

      // Add tags filter
      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : tags.split(',');
        where.tags = { [Op.overlap]: tagArray };
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
      console.error('Get documents error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve documents'
      });
    }
  }

  async getDocument(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const document = await Document.findOne({
        where: { id, uploadedBy: userId },
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

      res.json({
        document: {
          id: document.id,
          filename: document.originalName,
          size: document.size,
          mimeType: document.mimeType,
          uploadedAt: document.createdAt,
          tags: document.tags,
          metadata: document.metadata,
          isPublic: document.isPublic,
          downloadCount: document.downloadCount,
          ocrStatus: document.ocrStatus,
          ocrText: document.ocrText,
          ocrConfidence: document.ocrConfidence,
          checksum: document.checksum,
          uploader: document.uploader,
          downloadUrl: `/api/documents/${document.id}/download`
        }
      });
    } catch (error) {
      console.error('Get document error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve document'
      });
    }
  }

  async downloadDocument(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user ? req.user.id : null;

      const document = await Document.findByPk(id);

      if (!document) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Document not found'
        });
      }

      // Check permissions - user can download their own documents or public documents
      if (!document.isPublic && document.uploadedBy !== userId) {
        return res.status(403).json({
          error: 'Authorization Error',
          message: 'Access denied'
        });
      }

      // Get file stream from storage
      const fileStream = await storageService.downloadFile(document.storageKey);

      // Increment download count
      await document.incrementDownloadCount();

      // Log download action
      if (userId) {
        await AuditLog.logUserAction(req.user, 'download', 'document', {
          documentId: document.id,
          filename: document.originalName,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      }

      // Set response headers
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
      res.setHeader('Content-Length', document.size);

      // Pipe file stream to response
      fileStream.pipe(res);
    } catch (error) {
      console.error('Download document error:', error);
      
      if (error.message === 'File not found') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'File not found in storage'
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to download document'
      });
    }
  }

  async deleteDocument(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const document = await Document.findOne({
        where: { id, uploadedBy: userId }
      });

      if (!document) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Document not found'
        });
      }

      // Delete file from storage
      await storageService.deleteFile(document.storageKey);

      // Delete document record from database
      await document.destroy();

      // Log deletion action
      await AuditLog.logUserAction(req.user, 'delete', 'document', {
        documentId: document.id,
        filename: document.originalName,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Document deleted successfully'
      });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete document'
      });
    }
  }

  async updateDocument(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { tags, isPublic, metadata } = req.body;

      const document = await Document.findOne({
        where: { id, uploadedBy: userId }
      });

      if (!document) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Document not found'
        });
      }

      const updates = {};
      if (tags !== undefined) {
        updates.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
      }
      if (isPublic !== undefined) {
        updates.isPublic = Boolean(isPublic);
      }
      if (metadata !== undefined) {
        updates.metadata = { ...document.metadata, ...metadata };
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'No valid fields to update'
        });
      }

      await document.update(updates);

      // Log update action
      await AuditLog.logUserAction(req.user, 'update', 'document', {
        documentId: document.id,
        changes: updates,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Document updated successfully',
        document: {
          id: document.id,
          filename: document.originalName,
          tags: document.tags,
          isPublic: document.isPublic,
          metadata: document.metadata,
          updatedAt: document.updatedAt
        }
      });
    } catch (error) {
      console.error('Update document error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update document'
      });
    }
  }
}

module.exports = new DocumentController();