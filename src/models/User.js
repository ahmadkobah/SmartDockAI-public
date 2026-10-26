const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        len: [1, 255]
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 255]
      }
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100]
      }
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100]
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    passwordResetToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    passwordResetExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const saltRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
          user.password = await bcrypt.hash(user.password, saltRounds);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const saltRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
          user.password = await bcrypt.hash(user.password, saltRounds);
        }
      }
    }
  });

  // Instance methods
  User.prototype.validatePassword = async function(password) {
    return bcrypt.compare(password, this.password);
  };

  User.prototype.getFullName = function() {
    return `${this.firstName} ${this.lastName}`;
  };

  User.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.password;
    delete values.passwordResetToken;
    delete values.passwordResetExpiresAt;
    return values;
  };

  // Associations
  User.associate = function(models) {
    User.belongsToMany(models.Role, {
      through: models.UserRole,
      foreignKey: 'userId',
      otherKey: 'roleId',
      as: 'roles'
    });
    
    User.hasMany(models.Document, {
      foreignKey: 'uploadedBy',
      as: 'documents'
    });
    
    User.hasMany(models.AuditLog, {
      foreignKey: 'userId',
      as: 'auditLogs'
    });
  };

  // Class methods
  User.findByEmail = function(email) {
    return this.findOne({
      where: { email: email.toLowerCase() }
    });
  };

  User.createWithRole = async function(userData, roleName = 'user') {
    const transaction = await sequelize.transaction();
    try {
      const user = await this.create({
        ...userData,
        email: userData.email.toLowerCase()
      }, { transaction });

      const role = await sequelize.models.Role.findOne({
        where: { name: roleName },
        transaction
      });

      if (role) {
        await user.addRole(role, { transaction });
      }

      await transaction.commit();
      return user;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  };

  return User;
};