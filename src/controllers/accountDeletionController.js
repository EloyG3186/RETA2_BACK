const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { 
  User, 
  UserAuditTrail, 
  UserLegalHold, 
  UserExitSurvey, 
  AccountRecoveryRequest,
  Challenge,
  Participant,
  Transaction
} = require('../models');
const { Op } = require('sequelize');

// =====================================================
// CONTROLADOR DE ELIMINACIÓN DE CUENTA
// =====================================================

/**
 * Obtener estadísticas del usuario para mostrar antes de eliminación
 */
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener datos del usuario
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'fullName', 'createdAt']
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }
    
    // Contar desafíos activos
    const activeChallenges = await Challenge.count({
      where: {
        [Op.or]: [
          { creatorId: userId },
          { challengerId: userId }
        ],
        status: {
          [Op.in]: ['pending', 'active', 'judging']
        }
      }
    });
    
    // Contar participaciones
    const participations = await Participant.count({
      where: { userId: userId }
    });
    
    // Contar transacciones
    const transactions = await Transaction.count({
      include: [{
        model: require('../models').Wallet,
        as: 'wallet',
        where: { userId: userId }
      }]
    });
    
    // Calcular días desde registro
    const daysSinceJoin = Math.floor(
      (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)
    );
    
    const stats = {
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      joinDate: user.createdAt,
      daysSinceJoin,
      activeChallenges,
      totalParticipations: participations,
      totalTransactions: transactions,
      canDelete: true,
      restrictions: []
    };
    
    // Verificar retenciones legales
    const legalHolds = await UserLegalHold.findActiveByUserId(userId);
    if (legalHolds.length > 0) {
      stats.canDelete = false;
      stats.restrictions = legalHolds.map(hold => ({
        type: 'legal_hold',
        reason: hold.holdReason,
        caseReference: hold.caseReference,
        until: hold.holdUntil
      }));
    }
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error al obtener estadísticas del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Exportar datos del usuario (GDPR compliance)
 */
exports.exportUserData = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener todos los datos del usuario
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Challenge,
          as: 'createdChallenges',
          attributes: ['id', 'title', 'description', 'createdAt', 'status']
        },
        {
          model: Participant,
          as: 'participations',
          include: [{
            model: Challenge,
            as: 'challenge',
            attributes: ['title', 'description']
          }]
        }
      ]
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Preparar datos para exportación
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        bio: user.bio,
        location: user.location,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      challenges: user.createdChallenges || [],
      participations: user.participations || [],
      exportInfo: {
        format: 'JSON',
        version: '1.0',
        gdprCompliant: true,
        note: 'Este archivo contiene todos tus datos personales almacenados en RETA2'
      }
    };
    
    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="reta2_data_${user.username}_${Date.now()}.json"`);
    
    res.json(exportData);
    
  } catch (error) {
    console.error('Error al exportar datos del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al exportar datos',
      error: error.message
    });
  }
};

/**
 * Enviar encuesta de salida
 */
exports.submitExitSurvey = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      primaryReason,
      detailedReason,
      satisfactionRating,
      featuresUsed,
      suggestions,
      wouldRecommend,
      returnLikelihood,
      platformRating
    } = req.body;
    
    // Validaciones
    if (!primaryReason) {
      return res.status(400).json({
        success: false,
        message: 'La razón principal es requerida'
      });
    }
    
    // Verificar que no exista ya una encuesta para este usuario
    const existingSurvey = await UserExitSurvey.findOne({
      where: { userId: userId }
    });
    
    if (existingSurvey) {
      return res.status(400).json({
        success: false,
        message: 'Ya has enviado una encuesta de salida'
      });
    }
    
    // Crear encuesta
    const survey = await UserExitSurvey.create({
      userId,
      primaryReason,
      detailedReason,
      satisfactionRating,
      featuresUsed: Array.isArray(featuresUsed) ? featuresUsed : [],
      suggestions,
      wouldRecommend,
      returnLikelihood,
      platformRating
    });
    
    res.json({
      success: true,
      message: 'Encuesta de salida enviada exitosamente',
      data: { surveyId: survey.id }
    });
    
  } catch (error) {
    console.error('Error al enviar encuesta de salida:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar encuesta',
      error: error.message
    });
  }
};

/**
 * Desactivar cuenta (primer paso de eliminación)
 */
exports.deactivateAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password, reason } = req.body;
    
    // Validar contraseña
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña requerida para confirmar eliminación'
      });
    }
    
    // Obtener usuario
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña incorrecta'
      });
    }
    
    // Verificar retenciones legales
    const legalCheck = await UserLegalHold.checkUserCanBeDeleted(userId);
    if (!legalCheck.canDelete) {
      return res.status(403).json({
        success: false,
        message: 'No se puede eliminar la cuenta debido a retenciones legales',
        legalHolds: legalCheck.holds
      });
    }
    
    // Verificar si ya está desactivado
    if (user.accountStatus === 'deactivated') {
      return res.status(400).json({
        success: false,
        message: 'La cuenta ya está desactivada'
      });
    }
    
    // Desactivar cuenta
    const deactivatedAt = new Date();
    await user.update({
      accountStatus: 'deactivated',
      privacyLevel: 'restricted',
      deactivatedAt: deactivatedAt
    });
    
    // Calcular fecha límite para reactivación (30 días)
    const reactivationDeadline = new Date(deactivatedAt);
    reactivationDeadline.setDate(reactivationDeadline.getDate() + 30);
    
    // Log de auditoría
    console.log(`Usuario ${user.username} (${userId}) desactivó su cuenta en ${deactivatedAt.toISOString()}`);
    
    res.json({
      success: true,
      message: 'Cuenta desactivada exitosamente',
      data: {
        deactivatedAt: deactivatedAt.toISOString(),
        reactivationDeadline: reactivationDeadline.toISOString(),
        gracePeriodDays: 30
      }
    });
    
  } catch (error) {
    console.error('Error al desactivar cuenta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desactivar cuenta',
      error: error.message
    });
  }
};

/**
 * Reactivar cuenta durante período de gracia
 */
exports.reactivateAccount = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }
    
    // Buscar usuario desactivado
    const user = await User.findOne({
      where: {
        email: email,
        accountStatus: 'deactivated'
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o no está desactivado'
      });
    }
    
    // Verificar que esté dentro del período de gracia (30 días)
    const daysSinceDeactivation = Math.floor(
      (new Date() - new Date(user.deactivatedAt)) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceDeactivation > 30) {
      return res.status(400).json({
        success: false,
        message: 'El período de gracia ha expirado. Contacta soporte para recuperar tu cuenta.'
      });
    }
    
    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña incorrecta'
      });
    }
    
    // Reactivar cuenta
    await user.update({
      accountStatus: 'active',
      privacyLevel: 'public',
      deactivatedAt: null,
      lastLogin: new Date()
    });
    
    // Log de auditoría
    console.log(`Usuario ${user.username} (${user.id}) reactivó su cuenta en ${new Date().toISOString()}`);
    
    res.json({
      success: true,
      message: 'Cuenta reactivada exitosamente',
      data: {
        userId: user.id,
        username: user.username,
        reactivatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error al reactivar cuenta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reactivar cuenta',
      error: error.message
    });
  }
};

/**
 * Procesar eliminación de datos personales (después de 30 días)
 * Esta función se ejecutará automáticamente por un cron job
 */
exports.processPrivacyDeletion = async (userId) => {
  const transaction = await require('../config/database').sequelize.transaction();
  
  try {
    // Obtener usuario
    const user = await User.findByPk(userId, { transaction });
    if (!user || user.accountStatus !== 'deactivated') {
      throw new Error('Usuario no válido para eliminación de privacidad');
    }
    
    // Verificar que han pasado 30 días
    const daysSinceDeactivation = Math.floor(
      (new Date() - new Date(user.deactivatedAt)) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceDeactivation < 30) {
      throw new Error('No han pasado 30 días desde la desactivación');
    }
    
    // Crear registro de auditoría ANTES de eliminar datos
    const auditData = await UserAuditTrail.createFromUser(user, {
      type: 'privacy_deletion',
      reason: 'Eliminación automática después de 30 días',
      challengesCount: await Challenge.count({
        where: {
          [Op.or]: [
            { creatorId: userId },
            { challengerId: userId }
          ]
        }
      }),
      transactionsCount: await Transaction.count({
        include: [{
          model: require('../models').Wallet,
          as: 'wallet',
          where: { userId: userId }
        }]
      })
    });
    
    // Anonimizar datos personales
    const emailHash = crypto.createHash('sha256').update(user.email).digest('hex');
    
    await user.update({
      email: `deleted_${userId}@audit.local`,
      fullName: null,
      bio: null,
      location: null,
      profilePicture: null,
      accountStatus: 'privacy_deleted',
      privacyLevel: 'audit_only',
      privacyDeletedAt: new Date()
      // username se conserva para transparencia
    }, { transaction });
    
    await transaction.commit();
    
    console.log(`Datos personales eliminados para usuario ${userId}. Auditoría: ${auditData.id}`);
    return { success: true, auditId: auditData.id };
    
  } catch (error) {
    await transaction.rollback();
    console.error(`Error al procesar eliminación de privacidad para usuario ${userId}:`, error);
    throw error;
  }
};

/**
 * Obtener información sobre el proceso de eliminación
 */
exports.getDeletionInfo = async (req, res) => {
  try {
    const info = {
      process: {
        step1: {
          title: 'Desactivación inmediata',
          description: 'Tu cuenta se desactiva al instante',
          duration: 'Inmediato'
        },
        step2: {
          title: 'Período de gracia',
          description: 'Puedes reactivar tu cuenta fácilmente',
          duration: '30 días'
        },
        step3: {
          title: 'Eliminación de datos personales',
          description: 'Tus datos personales se eliminan permanentemente',
          duration: 'Después de 30 días'
        },
        step4: {
          title: 'Retención para auditoría',
          description: 'Solo se conservan datos mínimos para transparencia',
          duration: 'Indefinido'
        }
      },
      dataRetention: {
        eliminated: [
          'Email personal',
          'Nombre completo',
          'Biografía',
          'Ubicación',
          'Foto de perfil',
          'Información personal'
        ],
        preserved: [
          'Nombre de usuario (para transparencia)',
          'Participaciones en desafíos (anonimizadas)',
          'Estadísticas agregadas',
          'Logs de auditoría'
        ]
      },
      legalBasis: {
        gdpr: 'Cumple con el derecho al olvido (Art. 17)',
        transparency: 'Mantiene transparencia en desafíos',
        audit: 'Conserva datos necesarios para auditoría'
      }
    };
    
    res.json({
      success: true,
      data: info
    });
    
  } catch (error) {
    console.error('Error al obtener información de eliminación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener información',
      error: error.message
    });
  }
};

module.exports = exports;
