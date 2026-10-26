const { Sequelize } = require('sequelize');
const config = require('../../config');

class DatabaseService {
  constructor() {
    this.sequelize = null;
    this.models = null;
  }

  async connect() {
    try {
      const dbConfig = {
        host: config.database.host,
        port: config.database.port,
        dialect: 'postgres',
        logging: config.app.env === 'development' ? console.warn : false,
        pool: {
          min: config.database.pool.min,
          max: config.database.pool.max,
          acquire: 30000,
          idle: 10000
        }
      };

      if (config.database.ssl) {
        dbConfig.dialectOptions = {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        };
      }

      this.sequelize = new Sequelize(
        config.database.name,
        config.database.user,
        config.database.password,
        dbConfig
      );

      // Test the connection
      await this.sequelize.authenticate();
      console.warn('✅ Database connection established successfully');

      // Load models
      this.models = require('../models');

      return this.sequelize;
    } catch (error) {
      console.warn('⚠️  Database connection failed:', error.message);
      console.warn('🔄 Application will continue in database-free mode');
      
      // Set sequelize to null to indicate no database connection
      this.sequelize = null;
      this.models = null;
      
      // Don't throw - allow app to continue
      return null;
    }
  }

  async disconnect() {
    if (this.sequelize) {
      await this.sequelize.close();
      console.warn('🔌 Database connection closed');
    }
  }

  async sync(options = {}) {
    if (!this.sequelize) {
      console.warn('⚠️  Database not available - skipping sync');
      return;
    }

    try {
      await this.sequelize.sync(options);
      console.warn('📊 Database synchronized successfully');
    } catch (error) {
      console.error('❌ Database synchronization failed:', error.message);
      throw error;
    }
  }

  async migrate() {
    if (!this.sequelize) {
      console.warn('⚠️  Database not available - skipping migrations');
      return;
    }

    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      console.warn('🚀 Running database migrations...');
      const env = process.env.NODE_ENV || 'development';
      const cmd = [
        'npx sequelize-cli db:migrate',
        '--config config/database.js',
        `--env ${env}`,
        '--migrations-path src/migrations'
      ].join(' ');
      const { stdout, stderr } = await execAsync(cmd);
      
      if (stderr && !stderr.includes('Sequelize CLI')) {
        console.error('Migration stderr:', stderr);
      }
      
      console.warn('✅ Database migrations completed');
      return stdout;
    } catch (error) {
      console.error('❌ Database migration failed:', error.message);
      throw error;
    }
  }

  async seed() {
    if (!this.sequelize) {
      console.warn('⚠️  Database not available - skipping seeding');
      return;
    }

    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      console.warn('🌱 Running database seeders...');
      const env = process.env.NODE_ENV || 'development';
      const cmd = [
        'npx sequelize-cli db:seed:all',
        '--config config/database.js',
        `--env ${env}`,
        '--seeders-path src/seeders'
      ].join(' ');
      const { stdout, stderr } = await execAsync(cmd);
      
      if (stderr && !stderr.includes('Sequelize CLI')) {
        console.error('Seeder stderr:', stderr);
      }
      
      console.warn('✅ Database seeders completed');
      return stdout;
    } catch (error) {
      console.error('❌ Database seeding failed:', error.message);
      throw error;
    }
  }

  getModels() {
    return this.models;
  }

  getSequelize() {
    return this.sequelize;
  }

  async healthCheck() {
    if (!this.sequelize) {
      return {
        status: 'unavailable',
        message: 'Database connection not established'
      };
    }

    try {
      await this.sequelize.authenticate();
      return {
        status: 'healthy',
        message: 'Database connection is working'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message
      };
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;