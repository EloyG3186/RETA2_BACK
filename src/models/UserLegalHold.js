const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserLegalHold = sequelize.define('UserLegalHold', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  caseReference: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'case_reference',
    comment: 'Referencia del caso legal'
  },
  holdReason: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'hold_reason',
    comment: 'Motivo de la retención legal'
  },
  requestedBy: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'requested_by',
    comment: 'Autoridad que solicita la retención'
  },
  contactInfo: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'contact_info',
    comment: 'Información de contacto de la autoridad'
  },
  holdFrom: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'hold_from'
  },
  holdUntil: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'hold_until'
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'released'),
    defaultValue: 'active',
    allowNull: false
  }
}, {
  timestamps: true,
  tableName: 'user_legal_holds',
  underscored: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['hold_until']
    },
    {
      fields: ['case_reference']
    }
  ]
});

// Métodos de instancia
UserLegalHold.prototype.isActive = function() {
  if (this.status !== 'active') return false;
  
  if (this.holdUntil) {
    const today = new Date();
    const holdUntilDate = new Date(this.holdUntil);
    return holdUntilDate >= today;
  }
  
  return true; // Sin fecha de fin = indefinido
};

UserLegalHold.prototype.daysRemaining = function() {
  if (!this.holdUntil) return null; // Indefinido
  
  const today = new Date();
  const holdUntilDate = new Date(this.holdUntil);
  const diffTime = holdUntilDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
};

UserLegalHold.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  
  // Agregar campos calculados
  values.isActive = this.isActive();
  values.daysRemaining = this.daysRemaining();
  
  return values;
};

// Métodos estáticos
UserLegalHold.findActiveByUserId = async function(userId) {
  const { Op } = require('sequelize');
  
  return await this.findAll({
    where: {
      userId: userId,
      status: 'active',
      [Op.or]: [
        { holdUntil: null }, // Sin fecha de fin
        { holdUntil: { [Op.gte]: new Date() } } // Fecha futura
      ]
    },
    order: [['createdAt', 'DESC']]
  });
};

UserLegalHold.checkUserCanBeDeleted = async function(userId) {
  const activeHolds = await this.findActiveByUserId(userId);
  
  if (activeHolds.length > 0) {
    return {
      canDelete: false,
      reason: 'Usuario bajo retención legal',
      holds: activeHolds.map(hold => ({
        caseReference: hold.caseReference,
        reason: hold.holdReason,
        until: hold.holdUntil,
        requestedBy: hold.requestedBy
      }))
    };
  }
  
  return {
    canDelete: true,
    reason: null,
    holds: []
  };
};

UserLegalHold.createHold = async function(holdData) {
  // Validaciones
  if (!holdData.userId || !holdData.holdReason) {
    throw new Error('userId y holdReason son requeridos');
  }
  
  return await this.create({
    userId: holdData.userId,
    caseReference: holdData.caseReference,
    holdReason: holdData.holdReason,
    requestedBy: holdData.requestedBy,
    contactInfo: holdData.contactInfo,
    holdFrom: holdData.holdFrom || new Date(),
    holdUntil: holdData.holdUntil,
    status: 'active'
  });
};

UserLegalHold.releaseHold = async function(holdId, releasedBy) {
  const hold = await this.findByPk(holdId);
  if (!hold) {
    throw new Error('Retención legal no encontrada');
  }
  
  await hold.update({
    status: 'released',
    updatedAt: new Date()
  });
  
  // Log de auditoría
  console.log(`Retención legal ${holdId} liberada por ${releasedBy} en ${new Date().toISOString()}`);
  
  return hold;
};

UserLegalHold.expireOldHolds = async function() {
  const { Op } = require('sequelize');
  
  const expiredHolds = await this.update(
    { status: 'expired' },
    {
      where: {
        status: 'active',
        holdUntil: {
          [Op.lt]: new Date()
        }
      },
      returning: true
    }
  );
  
  console.log(`${expiredHolds[0]} retenciones legales expiradas automáticamente`);
  return expiredHolds;
};

module.exports = UserLegalHold;
