const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Rule = sequelize.define('Rule', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  challengeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'challenge_id', // Mapear a snake_case en la DB
    references: {
      model: 'challenges',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  orderIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'order_index', // Mapear a snake_case en la DB
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  isMandatory: {
    type: DataTypes.BOOLEAN,
    field: 'is_mandatory', // Mapear a snake_case en la DB
    defaultValue: true,
    allowNull: false
  }
}, {
  timestamps: true,
  tableName: 'rules',
  underscored: true, // Usar snake_case para todos los campos
  indexes: [
    {
      fields: ['challenge_id'] // Usar snake_case en los índices
    },
    {
      fields: ['challenge_id', 'order_index']
    }
  ]
});

module.exports = Rule;
