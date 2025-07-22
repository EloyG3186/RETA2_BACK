const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RewardRule = sequelize.define('RewardRule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  actionType: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'action_type',
    comment: 'Tipo de acción que activa la recompensa (create_challenge, win_challenge, etc.)'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Título descriptivo de la recompensa'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Descripción detallada de cómo ganar estos puntos'
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Cantidad de puntos que otorga esta acción'
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'FaTrophy',
    field: 'icon_name',
    comment: 'Nombre del ícono de React Icons (FaTrophy, FaCheck, etc.)'
  },
  color: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'cd-text-blue-500',
    field: 'color_class',
    comment: 'Clase CSS para el color del ícono'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
    comment: 'Indica si la regla está activa'
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'display_order',
    comment: 'Orden de visualización en la interfaz'
  }
}, {
  timestamps: true,
  tableName: 'reward_rules',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = RewardRule;
