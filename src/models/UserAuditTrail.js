const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserAuditTrail = sequelize.define('UserAuditTrail', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  originalUserId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'original_user_id'
  },
  username: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Nombre de usuario conservado para transparencia'
  },
  emailHash: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'email_hash',
    comment: 'Hash del email para identificación sin exponer datos'
  },
  accountCreatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'account_created_at'
  },
  accountDeletedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'account_deleted_at'
  },
  deletionType: {
    type: DataTypes.ENUM('voluntary', 'administrative', 'legal', 'violation'),
    defaultValue: 'voluntary',
    allowNull: false,
    field: 'deletion_type'
  },
  deletionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'deletion_reason'
  },
  challengesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    field: 'challenges_count'
  },
  transactionsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    field: 'transactions_count'
  },
  violationsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    field: 'violations_count'
  },
  totalPoints: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    field: 'total_points'
  },
  legalRetentionUntil: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'legal_retention_until'
  },
  auditData: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'audit_data',
    comment: 'Datos adicionales en formato JSON'
  }
}, {
  timestamps: true,
  tableName: 'user_audit_trail',
  underscored: true,
  indexes: [
    {
      fields: ['original_user_id']
    },
    {
      fields: ['username']
    },
    {
      fields: ['deletion_type']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Métodos de instancia
UserAuditTrail.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  
  // Formatear fechas para el frontend
  if (values.accountCreatedAt) {
    values.accountCreatedAt = values.accountCreatedAt.toISOString();
  }
  if (values.accountDeletedAt) {
    values.accountDeletedAt = values.accountDeletedAt.toISOString();
  }
  
  return values;
};

// Métodos estáticos
UserAuditTrail.createFromUser = async function(user, deletionData = {}) {
  const crypto = require('crypto');
  
  // Crear hash del email para identificación
  const emailHash = crypto.createHash('sha256').update(user.email).digest('hex');
  
  // Contar estadísticas del usuario (esto se haría con consultas reales)
  const challengesCount = deletionData.challengesCount || 0;
  const transactionsCount = deletionData.transactionsCount || 0;
  const violationsCount = deletionData.violationsCount || 0;
  const totalPoints = deletionData.totalPoints || 0;
  
  return await this.create({
    originalUserId: user.id,
    username: user.username,
    emailHash: emailHash,
    accountCreatedAt: user.createdAt,
    deletionType: deletionData.type || 'voluntary',
    deletionReason: deletionData.reason || null,
    challengesCount,
    transactionsCount,
    violationsCount,
    totalPoints,
    legalRetentionUntil: deletionData.legalRetentionUntil || null,
    auditData: {
      fullName: user.fullName,
      location: user.location,
      role: user.role,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLogin,
      deletionTimestamp: new Date().toISOString(),
      ...deletionData.additionalData
    }
  });
};

UserAuditTrail.findByOriginalUserId = async function(userId) {
  return await this.findOne({
    where: { originalUserId: userId },
    order: [['createdAt', 'DESC']]
  });
};

UserAuditTrail.getAnalytics = async function(startDate, endDate) {
  const { Op, fn, col, literal } = require('sequelize');
  
  const analytics = await this.findAll({
    where: {
      accountDeletedAt: {
        [Op.between]: [startDate, endDate]
      }
    },
    attributes: [
      [fn('COUNT', col('id')), 'totalDeletions'],
      [fn('AVG', col('total_points')), 'avgPoints'],
      [literal('deletion_type'), 'deletionType'],
      [fn('COUNT', col('deletion_type')), 'count']
    ],
    group: ['deletion_type'],
    raw: true
  });
  
  return analytics;
};

module.exports = UserAuditTrail;
