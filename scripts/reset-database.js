const DatabaseService = require('../src/services/DatabaseService');

async function resetDatabase() {
  console.warn('🔄 Resetting database...');
  console.warn('⚠️  WARNING: This will delete ALL data in the database!');

  try {
    await DatabaseService.connect();
    const sequelize = DatabaseService.getSequelize();

    // Delete data in reverse order of dependencies
    console.warn('Deleting audit logs...');
    await sequelize.query('DELETE FROM audit_log');

    console.warn('Deleting search queries...');
    await sequelize.query('DELETE FROM search_queries');

    console.warn('Deleting OCR processing records...');
    await sequelize.query('DELETE FROM ocr_icr_processing');

    console.warn('Deleting documents...');
    await sequelize.query('DELETE FROM documents');

    console.warn('Deleting user roles...');
    await sequelize.query('DELETE FROM user_roles');

    console.warn('Deleting users...');
    await sequelize.query('DELETE FROM users');

    console.warn('Deleting processing pipelines...');
    await sequelize.query('DELETE FROM processing_pipelines');

    console.warn('Deleting document types...');
    await sequelize.query('DELETE FROM document_types');

    console.warn('Deleting roles...');
    await sequelize.query('DELETE FROM roles');

    console.warn('✅ Database reset completed!');
    console.warn('💡 You can now run "npm run seed" to add sample data');

  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  } finally {
    if (DatabaseService.getSequelize()) {
      await DatabaseService.getSequelize().close();
    }
  }
}

// Run reset
if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.warn('Reset completed successfully');
    })
    .catch((error) => {
      console.error('Reset failed:', error);
    });
}

module.exports = resetDatabase;