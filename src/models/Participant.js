const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Participant = sequelize.define('Participant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  challengeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'challenges',
      key: 'id'
    }
  },
  joinDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'completed'),
    defaultValue: 'pending'
  },
  role: {
    type: DataTypes.ENUM('creator', 'challenger', 'judge', 'observer'),
    allowNull: true
  },
  result: {
    type: DataTypes.ENUM('win', 'loss', 'tie', 'none'),
    defaultValue: 'none'
  },
  score: {
    type: DataTypes.STRING,
    allowNull: true
  },
  proofImageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  proofDescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'refunded'),
    defaultValue: 'pending'
  },
  isWinner: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true,
  tableName: 'participants'
});

// Las relaciones se definen en el archivo index.js

module.exports = Participant;
