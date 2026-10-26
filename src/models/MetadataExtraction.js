module.exports = (sequelize, DataTypes) => {
  const MetadataExtraction = sequelize.define('MetadataExtraction', {
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
    extractionType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'regex'
    },
    fieldName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fieldValue: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0,
        max: 1
      }
    },
    position: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    extractedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'metadata_extractions',
    timestamps: true,
    indexes: [
      {
        fields: ['documentId']
      },
      {
        fields: ['fieldName']
      },
      {
        fields: ['extractionType']
      }
    ]
  });

  MetadataExtraction.associate = function(models) {
    MetadataExtraction.belongsTo(models.Document, {
      foreignKey: 'documentId',
      as: 'document'
    });
    
    MetadataExtraction.belongsTo(models.User, {
      foreignKey: 'extractedBy',
      as: 'extractor'
    });
  };

  return MetadataExtraction;
};