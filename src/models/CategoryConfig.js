const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CategoryConfig = sequelize.define('CategoryConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  minBetAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 1.00,
    validate: {
      min: 0
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'category_configs',
  timestamps: true,
  underscored: true,  // Esto convierte automáticamente camelCase a snake_case
  indexes: [
    {
      unique: true,
      fields: ['category_id']  // Usar snake_case para coincidir con la columna en la base de datos
    }
  ]
});

module.exports = CategoryConfig;
