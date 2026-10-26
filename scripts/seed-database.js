const bcrypt = require('bcryptjs');
const DatabaseService = require('../src/services/DatabaseService');

async function seedDatabase() {
  console.warn('🌱 Starting database seeding...');

  try {
    await DatabaseService.connect();
    const sequelize = DatabaseService.getSequelize();

    // Create sample roles
    console.warn('Creating roles...');
    await sequelize.query(`
      INSERT INTO roles (name, description, permissions, "createdAt", "updatedAt") VALUES 
      ('admin', 'System administrator with full access', '["*"]', NOW(), NOW()),
      ('user', 'Regular user with document access', '["documents:read", "documents:write", "ocr:process"]', NOW(), NOW())
      ON CONFLICT (name) DO UPDATE SET 
        description = EXCLUDED.description,
        permissions = EXCLUDED.permissions,
        "updatedAt" = NOW()
    `);

    // Get role IDs
    const roles = await sequelize.query('SELECT id, name FROM roles WHERE name IN ($1, $2)', {
      bind: ['admin', 'user'],
      type: sequelize.QueryTypes.SELECT
    });
    
    const adminRole = roles.find(r => r.name === 'admin');
    const userRole = roles.find(r => r.name === 'user');

    // Create sample users
    console.warn('Creating users...');
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const userPasswordHash = await bcrypt.hash('user123', 10);

    // Create or update admin user
    await sequelize.query(`
      INSERT INTO users (email, password, "firstName", "lastName", "isActive", "createdAt", "updatedAt") 
      VALUES ('admin@smartdockai.com', $1, 'System', 'Administrator', true, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName",
        "isActive" = EXCLUDED."isActive",
        "updatedAt" = NOW()
    `, { bind: [adminPasswordHash] });

    // Create or update regular user
    await sequelize.query(`
      INSERT INTO users (email, password, "firstName", "lastName", "isActive", "createdAt", "updatedAt") 
      VALUES ('user@smartdockai.com', $1, 'Demo', 'User', true, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName",
        "isActive" = EXCLUDED."isActive",
        "updatedAt" = NOW()
    `, { bind: [userPasswordHash] });

    // Get user IDs
    const users = await sequelize.query('SELECT id, email FROM users WHERE email IN ($1, $2)', {
      bind: ['admin@smartdockai.com', 'user@smartdockai.com'],
      type: sequelize.QueryTypes.SELECT
    });

    const adminUser = users.find(u => u.email === 'admin@smartdockai.com');
    const regularUser = users.find(u => u.email === 'user@smartdockai.com');

    // Create user_roles associations
    console.warn('Assigning roles...');
    
    // First, deactivate any existing role assignments
    await sequelize.query(`
      UPDATE user_roles SET "isActive" = false, "updatedAt" = NOW() 
      WHERE "userId" IN ($1, $2)
    `, { bind: [adminUser.id, regularUser.id] });

    // Then insert new role assignments
    await sequelize.query(`
      INSERT INTO user_roles ("userId", "roleId", "isActive", "assignedAt", "createdAt", "updatedAt") 
      VALUES 
        ($1, $2, true, NOW(), NOW(), NOW()),
        ($3, $4, true, NOW(), NOW(), NOW())
    `, { bind: [adminUser.id, adminRole.id, regularUser.id, userRole.id] });

    console.warn('✅ Database seeding completed successfully!');
    console.warn('\n🎉 Sample credentials created:');
    console.warn('👨‍💼 Admin: admin@smartdockai.com / admin123');
    console.warn('👤 User: user@smartdockai.com / user123');
    console.warn('\n🌐 You can now login to the frontend at: http://localhost:3000');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    if (DatabaseService.getSequelize()) {
      await DatabaseService.getSequelize().close();
    }
  }
}

// Run seeding
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.warn('Seeding completed successfully');
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
    });
}

module.exports = seedDatabase;