module.exports = (sequelize, DataTypes) => {
  const DocumentVersion = sequelize.define('DocumentVersion', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    documentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'documents',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    storageKey: {
      type: DataTypes.STRING,
      allowNull: false
    },
    size: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    checksum: {
      type: DataTypes.STRING,
      allowNull: true
    },
    changes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'document_versions',
    timestamps: true,
    indexes: [
      {
        fields: ['documentId', 'version'],
        unique: true
      }
    ]
  });

  DocumentVersion.associate = function(models) {
    DocumentVersion.belongsTo(models.Document, {
      foreignKey: 'documentId',
      as: 'document'
    });
    
    DocumentVersion.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
  };

  return DocumentVersion;
};