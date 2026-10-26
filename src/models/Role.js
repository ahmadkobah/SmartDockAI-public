module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [1, 50]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'roles',
    timestamps: true
  });

  // Associations
  Role.associate = function(models) {
    Role.belongsToMany(models.User, {
      through: models.UserRole,
      foreignKey: 'roleId',
      otherKey: 'userId',
      as: 'users'
    });
  };

  // Instance methods
  Role.prototype.hasPermission = function(permission) {
    return this.permissions.includes(permission);
  };

  Role.prototype.addPermission = function(permission) {
    if (!this.hasPermission(permission)) {
      this.permissions.push(permission);
    }
    return this;
  };

  Role.prototype.removePermission = function(permission) {
    this.permissions = this.permissions.filter(p => p !== permission);
    return this;
  };

  // Class methods
  Role.findByName = function(name) {
    return this.findOne({
      where: { name: name.toLowerCase() }
    });
  };

  Role.getPermissions = function() {
    return [
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
    ];
  };

  return Role;
};