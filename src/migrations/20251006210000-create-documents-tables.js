'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create Documents table
    await queryInterface.createTable('documents', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      filename: {
        type: Sequelize.STRING,
        allowNull: false
      },
      originalName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      mimeType: {
        type: Sequelize.STRING,
        allowNull: false
      },
      size: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      uploadedBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      storageKey: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      bucket: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'documents'
      },
      checksum: {
        type: Sequelize.STRING,
        allowNull: true
      },
      ocrStatus: {
        type: Sequelize.STRING,
        defaultValue: 'pending'
      },
      ocrText: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      ocrConfidence: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      downloadCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create Document Versions table
    await queryInterface.createTable('document_versions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      documentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'documents',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      storageKey: {
        type: Sequelize.STRING,
        allowNull: false
      },
      size: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      checksum: {
        type: Sequelize.STRING,
        allowNull: true
      },
      changes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create Metadata Extractions table
    await queryInterface.createTable('metadata_extractions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      documentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'documents',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      extractionType: {
        type: Sequelize.STRING,
        allowNull: false
      },
      fieldName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      fieldValue: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      confidence: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      position: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      extractedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      isVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create Audit Logs table
    await queryInterface.createTable('audit_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false
      },
      resource: {
        type: Sequelize.STRING,
        allowNull: false
      },
      resourceId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      details: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      ipAddress: {
        type: Sequelize.INET,
        allowNull: true
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: 'success'
      },
      level: {
        type: Sequelize.STRING,
        defaultValue: 'info'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes
    await queryInterface.addIndex('documents', ['uploadedBy']);
    await queryInterface.addIndex('documents', ['storageKey']);
    await queryInterface.addIndex('documents', ['ocrStatus']);
    await queryInterface.addIndex('documents', ['tags'], { using: 'gin' });
    await queryInterface.addIndex('documents', ['metadata'], { using: 'gin' });
    
    await queryInterface.addIndex('document_versions', ['documentId', 'version'], { unique: true });
    
    await queryInterface.addIndex('metadata_extractions', ['documentId']);
    await queryInterface.addIndex('metadata_extractions', ['fieldName']);
    await queryInterface.addIndex('metadata_extractions', ['extractionType']);
    
    await queryInterface.addIndex('audit_logs', ['userId']);
    await queryInterface.addIndex('audit_logs', ['action']);
    await queryInterface.addIndex('audit_logs', ['resource']);
    await queryInterface.addIndex('audit_logs', ['resourceId']);
    await queryInterface.addIndex('audit_logs', ['createdAt']);
    await queryInterface.addIndex('audit_logs', ['status']);
    await queryInterface.addIndex('audit_logs', ['level']);
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('metadata_extractions');
    await queryInterface.dropTable('document_versions');
    await queryInterface.dropTable('documents');
  }
};