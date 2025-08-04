const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AccountRecoveryRequest = sequelize.define('AccountRecoveryRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    comment: 'ID del usuario que solicita recuperación'
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  recoveryType: {
    type: DataTypes.ENUM('simple', 'verified', 'administrative'),
    allowNull: false,
    field: 'recovery_type',
    comment: 'Tipo de recuperación según tiempo transcurrido'
  },
  verificationMethod: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'verification_method',
    comment: 'Método de verificación utilizado'
  },
  documentsProvided: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'documents_provided',
    comment: 'Documentos de verificación en JSON'
  },
  verificationToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'verification_token',
    comment: 'Token para verificación de email'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'expired'),
    defaultValue: 'pending',
    allowNull: false
  },
  reviewedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'reviewed_by',
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  reviewNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'review_notes'
  },
  ipAddress: {
    type: DataTypes.INET,
    allowNull: true,
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at'
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'resolved_at'
  }
}, {
  timestamps: true,
  tableName: 'account_recovery_requests',
  underscored: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['email']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['verification_token']
    }
  ]
});

// Métodos de instancia
AccountRecoveryRequest.prototype.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

AccountRecoveryRequest.prototype.daysUntilExpiry = function() {
  if (!this.expiresAt) return null;
  
  const now = new Date();
  const expiry = new Date(this.expiresAt);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
};

AccountRecoveryRequest.prototype.approve = async function(reviewedBy, notes = '') {
  this.status = 'approved';
  this.reviewedBy = reviewedBy;
  this.reviewNotes = notes;
  this.resolvedAt = new Date();
  
  await this.save();
  return this;
};

AccountRecoveryRequest.prototype.reject = async function(reviewedBy, reason) {
  this.status = 'rejected';
  this.reviewedBy = reviewedBy;
  this.reviewNotes = reason;
  this.resolvedAt = new Date();
  
  await this.save();
  return this;
};

AccountRecoveryRequest.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  
  // Agregar campos calculados
  values.isExpired = this.isExpired();
  values.daysUntilExpiry = this.daysUntilExpiry();
  
  // No exponer datos sensibles
  delete values.verificationToken;
  
  return values;
};

// Métodos estáticos
AccountRecoveryRequest.determineRecoveryType = function(deletedAt) {
  if (!deletedAt) return 'simple';
  
  const now = new Date();
  const deletionDate = new Date(deletedAt);
  const daysSinceDeletion = Math.floor((now - deletionDate) / (1000 * 60 * 60 * 24));
  
  if (daysSinceDeletion <= 30) {
    return 'simple';
  } else if (daysSinceDeletion <= 365) {
    return 'verified';
  } else {
    return 'administrative';
  }
};

AccountRecoveryRequest.createRequest = async function(requestData) {
  const crypto = require('crypto');
  
  // Validaciones
  if (!requestData.userId || !requestData.email) {
    throw new Error('userId y email son requeridos');
  }
  
  // Verificar si ya existe una solicitud pendiente
  const existingRequest = await this.findOne({
    where: {
      userId: requestData.userId,
      status: 'pending'
    }
  });
  
  if (existingRequest && !existingRequest.isExpired()) {
    throw new Error('Ya existe una solicitud de recuperación pendiente');
  }
  
  // Determinar tipo de recuperación
  const recoveryType = this.determineRecoveryType(requestData.deletedAt);
  
  // Generar token de verificación
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  // Calcular fecha de expiración
  const expiresAt = new Date();
  if (recoveryType === 'simple') {
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 horas
  } else if (recoveryType === 'verified') {
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 días
  } else {
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 días
  }
  
  return await this.create({
    userId: requestData.userId,
    email: requestData.email,
    recoveryType,
    verificationMethod: requestData.verificationMethod || 'email',
    documentsProvided: requestData.documentsProvided || null,
    verificationToken,
    ipAddress: requestData.ipAddress,
    userAgent: requestData.userAgent,
    expiresAt
  });
};

AccountRecoveryRequest.findByToken = async function(token) {
  return await this.findOne({
    where: {
      verificationToken: token,
      status: 'pending'
    }
  });
};

AccountRecoveryRequest.findPendingByUserId = async function(userId) {
  return await this.findAll({
    where: {
      userId: userId,
      status: 'pending'
    },
    order: [['createdAt', 'DESC']]
  });
};

AccountRecoveryRequest.getAnalytics = async function(startDate, endDate) {
  const { Op, fn, col } = require('sequelize');
  
  const whereClause = {};
  if (startDate && endDate) {
    whereClause.createdAt = {
      [Op.between]: [startDate, endDate]
    };
  }
  
  // Estadísticas por tipo
  const typeStats = await this.findAll({
    where: whereClause,
    attributes: [
      'recovery_type',
      [fn('COUNT', col('recovery_type')), 'count']
    ],
    group: ['recovery_type'],
    raw: true
  });
  
  // Estadísticas por estado
  const statusStats = await this.findAll({
    where: whereClause,
    attributes: [
      'status',
      [fn('COUNT', col('status')), 'count']
    ],
    group: ['status'],
    raw: true
  });
  
  // Tiempo promedio de resolución
  const resolutionTime = await this.findOne({
    where: {
      ...whereClause,
      resolvedAt: { [Op.ne]: null }
    },
    attributes: [
      [fn('AVG', fn('EXTRACT', 'EPOCH', fn('AGE', col('resolved_at'), col('created_at')))), 'avgResolutionSeconds']
    ],
    raw: true
  });
  
  return {
    byType: typeStats,
    byStatus: statusStats,
    avgResolutionHours: resolutionTime.avgResolutionSeconds 
      ? Math.round(resolutionTime.avgResolutionSeconds / 3600) 
      : 0
  };
};

AccountRecoveryRequest.expireOldRequests = async function() {
  const { Op } = require('sequelize');
  
  const expiredRequests = await this.update(
    { status: 'expired' },
    {
      where: {
        status: 'pending',
        expiresAt: {
          [Op.lt]: new Date()
        }
      },
      returning: true
    }
  );
  
  console.log(`${expiredRequests[0]} solicitudes de recuperación expiradas automáticamente`);
  return expiredRequests;
};

module.exports = AccountRecoveryRequest;
