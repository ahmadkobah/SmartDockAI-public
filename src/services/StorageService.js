const Minio = require('minio');
const crypto = require('crypto');
const path = require('path');
const config = require('../../config');

class StorageService {
  constructor() {
    this.client = null;
    this.bucket = config.minio.bucket;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = new Minio.Client({
        endPoint: config.minio.endPoint,
        port: config.minio.port,
        accessKey: config.minio.accessKey,
        secretKey: config.minio.secretKey,
        useSSL: !!config.minio.useSSL
      });
      
      // Ensure bucket exists (create if missing)
      const exists = await this.client.bucketExists(this.bucket).catch(() => false);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
        console.warn(`📦 Created MinIO bucket: ${this.bucket}`);
      }
      
      this.isConnected = true;
      console.warn(`✅ Connected to MinIO storage: ${config.minio.endPoint}:${config.minio.port}`);
      return this.client;
    } catch (error) {
      console.error('❌ MinIO connection failed:', error.message);
      throw new Error(`MinIO connection failed: ${error.message}`);
    }
  }

  async disconnect() {
    this.isConnected = false;
     console.warn('MinIO storage disconnected');
  }

  generateStorageKey(originalFilename, userId) {
    const timestamp = new Date().toISOString().split('T')[0];
    const randomId = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalFilename);
    const basename = path.basename(originalFilename, ext);
    const sanitizedBasename = basename.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `documents/${userId}/${timestamp}/${randomId}_${sanitizedBasename}${ext}`;
  }

  async uploadFile(buffer, storageKey, metadata = {}) {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      await this.client.putObject(this.bucket, storageKey, buffer, {
        'Content-Type': metadata.contentType || 'application/octet-stream'
      });
      console.warn(`File uploaded: ${storageKey}`);
      return storageKey;
    } catch (error) {
      console.error('File upload failed:', error.message);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  async downloadFile(storageKey) {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      return await this.client.getObject(this.bucket, storageKey);
    } catch (error) {
      if (error.code === 'NoSuchKey') {
        throw new Error('File not found');
      }
      console.error('File download failed:', error.message);
      throw new Error(`File download failed: ${error.message}`);
    }
  }

  async deleteFile(storageKey) {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      await this.client.removeObject(this.bucket, storageKey);
      console.warn(`File deleted: ${storageKey}`);
      return true;
    } catch (error) {
      if (error.code === 'NoSuchKey') {
        throw new Error('File not found');
      }
      console.error('File deletion failed:', error.message);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  async getFileInfo(storageKey) {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      const stat = await this.client.statObject(this.bucket, storageKey);
      return stat;
    } catch (error) {
      if (error.code === 'NoSuchKey') {
        throw new Error('File not found');
      }
      console.error('Get file info failed:', error.message);
      throw new Error(`Get file info failed: ${error.message}`);
    }
  }

  async getFileEtag(storageKey) {
    try {
      const info = await this.getFileInfo(storageKey);
      return info.etag;
    } catch {
      return null;
    }
  }

  getFileUrl(storageKey) {
    return `/api/documents/download/${encodeURIComponent(storageKey)}`;
  }

  validateFileType(mimeType) {
    const allowedTypes = config.upload.allowedFileTypes;
    const fileExtension = this.getExtensionFromMimeType(mimeType);
    return allowedTypes.includes(fileExtension);
  }

  getExtensionFromMimeType(mimeType) {
    const mimeToExt = {
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'text/plain': 'txt',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/tiff': 'tiff',
      'image/tif': 'tiff'
    };
    return mimeToExt[mimeType] || 'unknown';
  }

  parseFileSize(sizeStr) {
    const units = { b: 1, kb: 1024, mb: 1048576, gb: 1073741824 };
    const match = sizeStr.toLowerCase().match(/^([\d]+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
    if (!match) return 0;
    const size = parseFloat(match[1]);
    const unit = match[2] || 'b';
    return size * units[unit];
  }

  validateFileSize(fileSize) {
    const maxSize = this.parseFileSize(config.upload.maxFileSize);
    return fileSize <= maxSize;
  }
}

const storageService = new StorageService();
module.exports = storageService;