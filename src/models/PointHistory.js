const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const RewardRule = require('./RewardRule');

const PointHistory = sequelize.define('PointHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: User,
      key: 'id'
    },
    comment: 'Usuario que ganó los puntos'
  },
  actionType: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'action_type',
    comment: 'Tipo de acción que generó los puntos'
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Cantidad de puntos otorgados'
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Descripción de por qué se otorgaron los puntos'
  },
  relatedEntityType: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'related_entity_type',
    comment: 'Tipo de entidad relacionada (Challenge, User, etc.)'
  },
  relatedEntityId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'related_entity_id',
    comment: 'ID de la entidad relacionada'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Información adicional en formato JSON'
  },
  previousTotal: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'previous_total',
    comment: 'Total de puntos antes de esta acción'
  },
  newTotal: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'new_total',
    comment: 'Total de puntos después de esta acción'
  },
  previousLevel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'previous_level',
    comment: 'Nivel antes de esta acción'
  },
  newLevel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'new_level',
    comment: 'Nivel después de esta acción'
  }
}, {
  timestamps: true,
  tableName: 'point_history',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Relaciones
PointHistory.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(PointHistory, { foreignKey: 'userId', as: 'pointHistory' });

module.exports = PointHistory;
