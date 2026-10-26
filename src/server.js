require('dotenv').config();
const app = require('./app');
const databaseService = require('./services/DatabaseService');

const PORT = process.env.PORT || 3000;

// Initialize database and start server
const startServer = async () => {
  let dbConnected = false;
  
  try {
    // Try to connect to database
    console.warn('🔄 Attempting database connection...');
    await databaseService.connect();
    dbConnected = true;
    console.warn('✅ Database connected successfully');
    
    // Run migrations if in development
    if (process.env.NODE_ENV === 'development') {
      try {
        await databaseService.migrate();
        await databaseService.seed();
        console.warn('✅ Database migrations and seeding completed');
      } catch (migrationError) {
        console.warn('⚠️  Migration/seeding warning:', migrationError.message);
      }
    }
  } catch (dbError) {
    console.warn('⚠️  Database connection failed:', dbError.message);
    console.warn('🔄 Continuing without database (some features may be limited)');
    dbConnected = false;
  }

  try {
    // Start server regardless of database connection
    const server = app.listen(PORT, () => {
      console.warn(`🚀 SmartDockAI server running on port ${PORT}`);
      console.warn(`📡 Health check: http://localhost:${PORT}/health`);
      console.warn(`📖 API docs: http://localhost:${PORT}/api`);
      
      if (!dbConnected) {
        console.warn('⚠️  Note: Database not connected - some features may be limited');
        console.warn('💡 Your React frontend with active buttons will still work!');
      }
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.warn(`${signal} received, shutting down gracefully`);
      
      server.close(async () => {
        if (dbConnected) {
          await databaseService.disconnect();
        }
        console.warn('Process terminated');
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    throw error;
  }
};

// Start the server
startServer();

module.exports = startServer;
