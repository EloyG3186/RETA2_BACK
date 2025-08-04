const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 30]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 100]
    }
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  profilePicture: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'default-profile.png'
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  verificationToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  verificationTokenExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Campos para sistema de eliminación de cuenta
  accountStatus: {
    type: DataTypes.ENUM('active', 'deactivated', 'privacy_deleted', 'audit_retained', 'legal_hold', 'suspended'),
    defaultValue: 'active',
    allowNull: false
  },
  privacyLevel: {
    type: DataTypes.ENUM('public', 'restricted', 'audit_only'),
    defaultValue: 'public',
    allowNull: false
  },
  deactivatedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  privacyDeletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  auditRetention: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  legalHoldUntil: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  },
  timestamps: true,
  tableName: 'users',
  underscored: true // Esto asegura que Sequelize convierta entre snake_case (DB) y camelCase (JS)
});

// Método para comparar contraseñas
User.prototype.comparePassword = async function(candidatePassword) {
  console.log('Comparando contraseña:', {
    candidatePassword,
    storedPassword: this.password.substring(0, 20) + '...' // Solo mostramos parte del hash por seguridad
  });
  try {
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('Resultado de la comparación:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('Error al comparar contraseñas:', error);
    return false;
  }
};

module.exports = User;
