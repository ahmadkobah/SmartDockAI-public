require('dotenv').config();

const config = {
  // Application Configuration
  app: {
    name: process.env.APP_NAME || 'SmartDockAI',
    version: process.env.APP_VERSION || '1.0.0',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    debugMode: process.env.DEBUG_MODE === 'true',
    enableApiDocs: process.env.ENABLE_API_DOCS === 'true',
    enableMetrics: process.env.ENABLE_METRICS === 'true'
  },

  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'smartdock_db',
    user: process.env.DB_USER || 'smartdock_user',
    password: process.env.DB_PASSWORD || 'smartdock_password',
    ssl: process.env.DB_SSL === 'true',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
      max: parseInt(process.env.DB_POOL_MAX, 10) || 10
    }
  },


  // MinIO Storage Configuration
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT, 10) || 9000,
    accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
    secretKey: process.env.MINIO_SECRET_KEY || 'adminpassword',
    useSSL: process.env.MINIO_USE_SSL === 'true',
    bucket: process.env.MINIO_BUCKET || 'documents'
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: parseInt(process.env.REDIS_DB, 10) || 0
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  // API Configuration
  api: {
    rateLimit: {
      windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 minutes
      maxRequests: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS, 10) || 100
    },
    requestSizeLimit: process.env.API_REQUEST_SIZE_LIMIT || '10mb'
  },

  // File Upload Configuration
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || '50mb',
    allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,txt,jpg,jpeg,png,tiff').split(','),
    uploadPath: process.env.UPLOAD_PATH || 'uploads'
  },

  // OCR Configuration
  ocr: {
    tesseractPath: process.env.TESSERACT_PATH || '/usr/bin/tesseract',
    languages: process.env.OCR_LANGUAGES || 'eng',
    timeout: parseInt(process.env.OCR_TIMEOUT, 10) || 30000
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/smartdock.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES, 10) || 5
  },

  // Security Configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    sessionSecret: process.env.SESSION_SECRET || 'fallback-session-secret',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  },

  // Email Configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      user: process.env.SMTP_USER || '',
      password: process.env.SMTP_PASSWORD || ''
    },
    from: process.env.SMTP_FROM || 'noreply@smartdockai.com'
  }
};

// Validate critical configuration
const validateConfig = () => {
  const requiredConfigs = [
    { key: 'JWT_SECRET', value: config.jwt.secret, condition: config.jwt.secret === 'fallback-secret-change-in-production' },
    { key: 'DATABASE_PASSWORD', value: config.database.password, condition: !config.database.password },
    { key: 'MINIO_ACCESS_KEY', value: config.minio.accessKey, condition: !config.minio.accessKey },
    { key: 'MINIO_SECRET_KEY', value: config.minio.secretKey, condition: !config.minio.secretKey }
  ];

  const missingConfigs = requiredConfigs.filter(cfg => cfg.condition);

  if (missingConfigs.length > 0 && config.app.env === 'production') {
    console.error('❌ Missing required configuration for production:');
    missingConfigs.forEach(cfg => {
      console.error(`   - ${cfg.key}`);
    });
    throw new Error('Missing required production configuration');
  }

  if (missingConfigs.length > 0 && config.app.env === 'development') {
    console.warn('⚠️  Using fallback configuration for development:');
    missingConfigs.forEach(cfg => {
      console.warn(`   - ${cfg.key}: ${cfg.value}`);
    });
  }
};

// Validate configuration on load
validateConfig();

module.exports = config;