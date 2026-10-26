const { Sequelize } = require('sequelize');
const config = require('../config');

async function cleanDatabase() {
  console.warn('🧹 Starting complete database cleanup...');

  try {
    const sequelize = new Sequelize(
      config.database.name,
      config.database.user,
      config.database.password,
      {
        host: config.database.host,
        port: config.database.port,
        dialect: 'postgres',
        logging: false
      }
    );

    await sequelize.authenticate();
    console.warn('✅ Connected to database');

    // Drop all tables in the correct order (respecting foreign key constraints)
    const tablesToDrop = [
      'user_roles',
      'audit_logs', 
      'metadata_extractions',
      'document_versions',
      'documents',
      'users',
      'roles',
      'SequelizeMeta'  // Drop migration tracking table too
    ];

    for (const table of tablesToDrop) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.warn(`🗑️  Dropped table: ${table}`);
      } catch (error) {
        console.warn(`⚠️  Table ${table} not found, skipping...`);
      }
    }

    // Drop any ENUMs that might exist
    const enumsToCheck = ['enum_documents_ocrStatus', 'enum_metadata_extractions_extractionType', 'enum_audit_logs_status', 'enum_audit_logs_level'];
    for (const enumType of enumsToCheck) {
      try {
        await sequelize.query(`DROP TYPE IF EXISTS "${enumType}" CASCADE`);
        console.warn(`🗑️  Dropped enum: ${enumType}`);
      } catch (error) {
        // Ignore if enum doesn't exist
      }
    }

    await sequelize.close();
    console.warn('✅ Database cleanup completed!');
    console.warn('💡 You can now run migrations and seeds');

  } catch (error) {
    console.error('❌ Database cleanup failed:', error.message);
    throw error;
  }
}

// Run cleanup
if (require.main === module) {
  cleanDatabase()
    .then(() => {
      console.warn('Cleanup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = cleanDatabase;