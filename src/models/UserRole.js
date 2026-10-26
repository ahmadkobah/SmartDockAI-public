module.exports = (sequelize, DataTypes) => {
  const UserRole = sequelize.define('UserRole', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    assignedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'user_roles',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'roleId'],
        where: {
          isActive: true
        }
      }
    ]
  });

  // Associations
  UserRole.associate = function(models) {
    UserRole.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    UserRole.belongsTo(models.Role, {
      foreignKey: 'roleId',
      as: 'role'
    });
    
    UserRole.belongsTo(models.User, {
      foreignKey: 'assignedBy',
      as: 'assignedByUser'
    });
  };

  // Instance methods
  UserRole.prototype.isExpired = function() {
    return this.expiresAt && new Date() > this.expiresAt;
  };

  UserRole.prototype.isValid = function() {
    return this.isActive && !this.isExpired();
  };

  // Hooks
  UserRole.addHook('beforeCreate', (userRole) => {
    userRole.assignedAt = new Date();
  });

  return UserRole;
};