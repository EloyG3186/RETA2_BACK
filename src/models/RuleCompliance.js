const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RuleCompliance = sequelize.define('RuleCompliance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ruleId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'rule_id', // Mapear a snake_case en la DB
    references: {
      model: 'rules',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  participantId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'participant_id', // Mapear a snake_case en la DB
    references: {
      model: 'participants',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  judgeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'judge_id', // Mapear a snake_case en la DB
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isCompliant: {
    type: DataTypes.BOOLEAN,
    field: 'is_compliant', // Mapear a snake_case en la DB
    allowNull: true, // NULL = no evaluado, true/false = evaluado
    comment: 'NULL = not evaluated, true = compliant, false = not compliant'
  },
  judgeComments: {
    type: DataTypes.TEXT,
    field: 'judge_comments', // Mapear a snake_case en la DB
    allowNull: true,
    comment: 'Judge comments about the compliance evaluation'
  },
  evaluatedAt: {
    type: DataTypes.DATE,
    field: 'evaluated_at', // Mapear a snake_case en la DB
    allowNull: true,
    comment: 'When the judge made the evaluation'
  },
  autoEvaluated: {
    type: DataTypes.BOOLEAN,
    field: 'auto_evaluated', // Mapear a snake_case en la DB
    allowNull: false,
    defaultValue: false,
    comment: 'True if this evaluation was done automatically by the system'
  }
}, {
  timestamps: true,
  tableName: 'rule_compliance',
  underscored: true, // Usar snake_case para todos los campos
  indexes: [
    {
      fields: ['rule_id'] // Usar snake_case en los índices
    },
    {
      fields: ['participant_id']
    },
    {
      fields: ['judge_id']
    },
    {
      unique: true,
      fields: ['rule_id', 'participant_id']
    }
  ]
});

module.exports = RuleCompliance;
