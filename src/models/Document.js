module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255]
      }
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255]
      }
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100]
      }
    },
    size: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    storageKey: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    bucket: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'documents'
    },
    checksum: {
      type: DataTypes.STRING,
      allowNull: true
    },
    ocrStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'pending'
    },
    ocrText: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ocrConfidence: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0,
        max: 1
      }
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    downloadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'documents',
    timestamps: true,
    indexes: [
      {
        fields: ['uploadedBy']
      },
      {
        fields: ['storageKey']
      },
      {
        fields: ['ocrStatus']
      },
      {
        fields: ['tags'],
        using: 'gin'
      },
      {
        fields: ['metadata'],
        using: 'gin'
      }
    ]
  });

  // Associations
  Document.associate = function(models) {
    Document.belongsTo(models.User, {
      foreignKey: 'uploadedBy',
      as: 'uploader'
    });
    
    Document.hasMany(models.DocumentVersion, {
      foreignKey: 'documentId',
      as: 'versions'
    });
    
    Document.hasMany(models.MetadataExtraction, {
      foreignKey: 'documentId',
      as: 'extractions'
    });
  };

  // Instance methods
  Document.prototype.incrementDownloadCount = function() {
    return this.increment('downloadCount');
  };

  Document.prototype.addTag = function(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      return this.save();
    }
    return Promise.resolve(this);
  };

  Document.prototype.removeTag = function(tag) {
    this.tags = this.tags.filter(t => t !== tag);
    return this.save();
  };

  Document.prototype.getFileUrl = function() {
    return `/api/documents/${this.id}/download`;
  };

  // Class methods
  Document.findByUser = function(userId, options = {}) {
    return this.findAll({
      where: { uploadedBy: userId },
      ...options
    });
  };

  Document.searchByText = function(searchTerm, options = {}) {
    return this.findAll({
      where: {
        [sequelize.Op.or]: [
          { originalName: { [sequelize.Op.iLike]: `%${searchTerm}%` } },
          { ocrText: { [sequelize.Op.iLike]: `%${searchTerm}%` } },
          { tags: { [sequelize.Op.contains]: [searchTerm] } }
        ]
      },
      ...options
    });
  };

  return Document;
};