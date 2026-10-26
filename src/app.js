const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const databaseService = require('./services/DatabaseService');
let specs = {};
let swaggerUi = { serve: (req, res, next) => next(), setup: () => (req, res, next) => next() };
let options = {};
try {
  // Docs are optional in container images; only load if present
  const swaggerModule = require('../docs/swagger');
  specs = swaggerModule.specs || specs;
  swaggerUi = swaggerModule.swaggerUi || swaggerUi;
  options = swaggerModule.options || options;
} catch (err) {
  console.warn('Warning: docs/swagger not found. API docs will be disabled in this environment.');
}

const app = express();

// Service Orchestrator for starting all services
const ServiceOrchestrator = require('./services/ServiceOrchestrator');
const serviceOrchestrator = new ServiceOrchestrator();

// Auto-start all services if START_ALL_SERVICES environment variable is set
if (process.env.START_ALL_SERVICES === 'true') {
  // Setup graceful shutdown handlers
  serviceOrchestrator.setupShutdownHandlers();
  
  // Start all services after a short delay to allow main server to initialize
  setTimeout(async () => {
    await serviceOrchestrator.startAllServices();
  }, 2000);
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "http://localhost:5173"],
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:3000", "ws://localhost:3000", "http://localhost:5173", "ws://localhost:5173"],
      frameSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      workerSrc: ["'self'", "blob:"]
    }
  }
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// In development, the React app runs on Vite dev server (port 5173) with a proxy
// In production, we'll serve the built assets from client/dist
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
}

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbHealth = await databaseService.healthCheck();
  
  res.status(200).json({
    status: 'OK',
    message: 'SmartDockAI API is running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: dbHealth,
      runningServices: serviceOrchestrator.services.map(s => ({
        name: s.name,
        pid: s.pid,
        status: s.process.killed ? 'stopped' : 'running'
      }))
    }
  });
});

// Service management endpoints
app.post('/api/services/start-all', async (req, res) => {
  try {
    const success = await serviceOrchestrator.startAllServices();
    res.json({
      success,
      message: success ? 'All services started successfully' : 'Some services failed to start',
      services: serviceOrchestrator.services.map(s => s.name)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to start services',
      error: error.message
    });
  }
});

app.post('/api/services/stop-all', async (req, res) => {
  try {
    await serviceOrchestrator.stopAllServices();
    res.json({
      success: true,
      message: 'All services stopped successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to stop services',
      error: error.message
    });
  }
});

app.get('/api/services/status', (req, res) => {
  res.json({
    services: serviceOrchestrator.services.map(s => ({
      name: s.name,
      pid: s.pid,
      status: s.process.killed ? 'stopped' : 'running'
    }))
  });
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, options));

// API routes will be added here
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to SmartDockAI API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      documents: '/api/documents',
      ocr: '/api/ocr',
      icr: '/api/icr',
      nlp: '/api/nlp',
      intelligence: '/api/intelligence',
      search: '/api/search',
      admin: '/api/admin',
      users: '/api/users',
      modelRegistry: '/api/models/registry'
    }
  });
});

// Mount auth routes
app.use('/api/auth', (req, res, next) => {
  console.log('🔍 [APP] Auth route accessed:', req.method, req.path);
  next();
}, require('./routes/auth'));

// Mount document routes
app.use('/api/documents', require('./routes/documents'));

// Mount OCR routes
app.use('/api/ocr', require('./routes/ocr'));

// Mount ICR routes
app.use('/api/icr', require('./routes/icr'));

// Mount NLP routes
app.use('/api/nlp', require('./routes/nlp'));

// Mount Model Registry routes
app.use('/api/models/registry', require('./routes/modelRegistry'));

// Mount search routes
app.use('/api/search', require('./routes/search'));

// Mount admin routes
app.use('/api/admin', require('./routes/admin'));

// Mount Document Intelligence routes
app.use('/api/intelligence', require('./routes/intelligence'));

// Fallback: For non-API routes in production, serve the React index.html
if (isProd) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Error:', err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON payload',
      message: 'Please check your request body'
    });
  }

  return res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

module.exports = app;
