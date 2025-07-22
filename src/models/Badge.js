const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Badge = sequelize.define('Badge', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  category: {
    type: DataTypes.ENUM('challenges', 'social', 'judge', 'special'),
    allowNull: false
  }
}, {
  timestamps: true
});

// Tabla de relación muchos a muchos para usuarios y sus insignias
const UserBadge = sequelize.define('UserBadge', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  badgeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Badge,
      key: 'id'
    }
  },
  dateEarned: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  tableName: 'user_badges'
});

// Relaciones
Badge.belongsToMany(User, { through: UserBadge, foreignKey: 'badgeId' });
User.belongsToMany(Badge, { through: UserBadge, foreignKey: 'userId' });

module.exports = { Badge, UserBadge };
