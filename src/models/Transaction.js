const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  walletId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'wallets',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('deposit', 'withdrawal', 'transfer', 'challenge_win', 'challenge_loss'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      notNull: true,
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
    defaultValue: 'pending'
  },
  referenceId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  destinationWalletId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'wallets',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  tableName: 'transactions'
});

// Las relaciones se definen en el archivo index.js

module.exports = Transaction;
