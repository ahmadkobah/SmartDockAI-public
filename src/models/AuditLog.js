module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100]
      }
    },
    resource: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100]
      }
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    ipAddress: {
      type: DataTypes.INET,
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'success'
    },
    level: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'info'
    }
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['action']
      },
      {
        fields: ['resource']
      },
      {
        fields: ['resourceId']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['status']
      },
      {
        fields: ['level']
      }
    ]
  });

  // Associations
  AuditLog.associate = function(models) {
    AuditLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  // Class methods
  AuditLog.log = function(logData) {
    return this.create({
      userId: logData.userId || null,
      action: logData.action,
      resource: logData.resource,
      resourceId: logData.resourceId || null,
      details: logData.details || {},
      ipAddress: logData.ipAddress || null,
      userAgent: logData.userAgent || null,
      status: logData.status || 'success',
      level: logData.level || 'info'
    });
  };

  AuditLog.logUserAction = function(user, action, resource, additionalData = {}) {
    return this.create({
      userId: user?.id || null,
      action: action,
      resource: resource,
      resourceId: additionalData.resourceId || null,
      details: additionalData,
      ipAddress: additionalData.ipAddress || null,
      userAgent: additionalData.userAgent || null,
      status: additionalData.status || 'success',
      level: additionalData.level || 'info'
    });
  };

  return AuditLog;
};