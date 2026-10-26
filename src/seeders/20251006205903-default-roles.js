'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    const now = new Date();

    const roles = [
      {
        name: 'admin',
        description: 'Administrator with full system access',
        permissions: JSON.stringify([
          'documents:create',
          'documents:read',
          'documents:update',
          'documents:delete',
          'documents:download',
          'users:create',
          'users:read',
          'users:update',
          'users:delete',
          'roles:create',
          'roles:read',
          'roles:update',
          'roles:delete',
          'audit:read',
          'system:admin'
        ]),
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'user',
        description: 'Standard user with basic document access',
        permissions: JSON.stringify([
          'documents:create',
          'documents:read',
          'documents:download'
        ]),
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'moderator',
        description: 'Moderator with extended document management access',
        permissions: JSON.stringify([
          'documents:create',
          'documents:read',
          'documents:update',
          'documents:delete',
          'documents:download',
          'users:read'
        ]),
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'viewer',
        description: 'Read-only access to documents',
        permissions: JSON.stringify([
          'documents:read',
          'documents:download'
        ]),
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ];

    // Fetch existing role names to avoid duplicates
    const existing = await queryInterface.sequelize.query(
      'SELECT name FROM roles;',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const existingNames = new Set(existing.map(r => r.name));
    const toInsert = roles.filter(r => !existingNames.has(r.name));

    if (toInsert.length > 0) {
      await queryInterface.bulkInsert('roles', toInsert);
    }
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.bulkDelete('roles', null, {});
  }
};
