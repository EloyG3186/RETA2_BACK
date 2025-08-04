const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { 
  User, 
  UserAuditTrail, 
  AccountRecoveryRequest 
} = require('../models');
const { Op } = require('sequelize');

// =====================================================
// CONTROLADOR DE RECUPERACIÓN DE CUENTA
// =====================================================

/**
 * Solicitar recuperación de cuenta eliminada
 */
exports.requestAccountRecovery = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }
    
    // Buscar usuario eliminado o desactivado
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: email },
          { email: `deleted_${email.split('@')[0]}@audit.local` }
        ],
        accountStatus: {
          [Op.in]: ['deactivated', 'privacy_deleted']
        }
      }
    });
    
    // Si no se encuentra, buscar en auditoría
    let auditRecord = null;
    if (!user) {
      const emailHash = crypto.createHash('sha256').update(email).digest('hex');
      auditRecord = await UserAuditTrail.findOne({
        where: { emailHash: emailHash }
      });
    }
    
    if (!user && !auditRecord) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró una cuenta eliminada asociada a este email'
      });
    }
    
    // Determinar tipo de recuperación
    const deletedAt = user ? user.deactivatedAt || user.privacyDeletedAt : auditRecord.accountDeletedAt;
    const recoveryType = AccountRecoveryRequest.determineRecoveryType(deletedAt);
    
    // Verificar si ya existe una solicitud pendiente
    const existingRequest = await AccountRecoveryRequest.findOne({
      where: {
        email: email,
        status: 'pending'
      }
    });
    
    if (existingRequest && !existingRequest.isExpired()) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una solicitud de recuperación pendiente',
        data: {
          requestId: existingRequest.id,
          expiresAt: existingRequest.expiresAt,
          recoveryType: existingRequest.recoveryType
        }
      });
    }
    
    // Crear nueva solicitud
    const recoveryRequest = await AccountRecoveryRequest.createRequest({
      userId: user ? user.id : auditRecord.originalUserId,
      email: email,
      deletedAt: deletedAt,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Preparar respuesta según tipo de recuperación
    let response = {
      success: true,
      message: 'Solicitud de recuperación creada exitosamente',
      data: {
        requestId: recoveryRequest.id,
        recoveryType: recoveryRequest.recoveryType,
        expiresAt: recoveryRequest.expiresAt
      }
    };
    
    switch (recoveryRequest.recoveryType) {
      case 'simple':
        response.data.instructions = {
          title: 'Recuperación Simple',
          description: 'Tu cuenta fue eliminada hace menos de 30 días',
          steps: [
            'Revisa tu email para el enlace de verificación',
            'Haz clic en el enlace para confirmar tu identidad',
            'Tu cuenta será reactivada automáticamente'
          ],
          estimatedTime: '24 horas'
        };
        break;
        
      case 'verified':
        response.data.instructions = {
          title: 'Recuperación con Verificación',
          description: 'Tu cuenta fue eliminada hace más de 30 días',
          steps: [
            'Proporciona documentos de identificación',
            'Nuestro equipo revisará tu solicitud',
            'Recibirás una respuesta en 3-5 días hábiles'
          ],
          estimatedTime: '3-5 días hábiles',
          documentsRequired: [
            'Identificación oficial (INE, pasaporte, etc.)',
            'Comprobante de acceso al email registrado',
            'Respuestas a preguntas de seguridad'
          ]
        };
        break;
        
      case 'administrative':
        response.data.instructions = {
          title: 'Recuperación Administrativa',
          description: 'Tu cuenta fue eliminada hace más de 1 año',
          steps: [
            'Contacta a nuestro equipo de soporte',
            'Proporciona documentación completa',
            'Proceso de revisión manual detallado'
          ],
          estimatedTime: '1-2 semanas',
          note: 'Este proceso requiere revisión manual por nuestro equipo de seguridad'
        };
        break;
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('Error al solicitar recuperación de cuenta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar solicitud de recuperación',
      error: error.message
    });
  }
};

/**
 * Verificar token de recuperación (para recuperación simple)
 */
exports.verifyRecoveryToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token de verificación requerido'
      });
    }
    
    // Buscar solicitud por token
    const recoveryRequest = await AccountRecoveryRequest.findByToken(token);
    
    if (!recoveryRequest) {
      return res.status(404).json({
        success: false,
        message: 'Token de recuperación inválido o expirado'
      });
    }
    
    if (recoveryRequest.isExpired()) {
      await recoveryRequest.update({ status: 'expired' });
      return res.status(400).json({
        success: false,
        message: 'El token de recuperación ha expirado'
      });
    }
    
    // Solo permitir verificación automática para recuperación simple
    if (recoveryRequest.recoveryType !== 'simple') {
      return res.status(400).json({
        success: false,
        message: 'Este tipo de recuperación requiere revisión manual'
      });
    }
    
    // Buscar usuario
    const user = await User.findByPk(recoveryRequest.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Reactivar cuenta
    await user.update({
      accountStatus: 'active',
      privacyLevel: 'public',
      deactivatedAt: null,
      lastLogin: new Date()
    });
    
    // Marcar solicitud como aprobada
    await recoveryRequest.approve(null, 'Recuperación automática por token válido');
    
    // Log de auditoría
    console.log(`Cuenta recuperada automáticamente: ${user.username} (${user.id})`);
    
    res.json({
      success: true,
      message: 'Cuenta recuperada exitosamente',
      data: {
        userId: user.id,
        username: user.username,
        recoveredAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error al verificar token de recuperación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar token',
      error: error.message
    });
  }
};

/**
 * Subir documentos para recuperación verificada
 */
exports.uploadRecoveryDocuments = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { documents, additionalInfo } = req.body;
    
    // Buscar solicitud
    const recoveryRequest = await AccountRecoveryRequest.findByPk(requestId);
    
    if (!recoveryRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de recuperación no encontrada'
      });
    }
    
    if (recoveryRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Esta solicitud ya ha sido procesada'
      });
    }
    
    if (recoveryRequest.recoveryType === 'simple') {
      return res.status(400).json({
        success: false,
        message: 'Este tipo de recuperación no requiere documentos'
      });
    }
    
    // Actualizar solicitud con documentos
    await recoveryRequest.update({
      documentsProvided: {
        documents: documents || [],
        additionalInfo: additionalInfo || '',
        uploadedAt: new Date().toISOString(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    
    res.json({
      success: true,
      message: 'Documentos subidos exitosamente',
      data: {
        requestId: recoveryRequest.id,
        status: 'pending_review',
        estimatedReviewTime: recoveryRequest.recoveryType === 'verified' ? '3-5 días hábiles' : '1-2 semanas'
      }
    });
    
  } catch (error) {
    console.error('Error al subir documentos de recuperación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir documentos',
      error: error.message
    });
  }
};

/**
 * Obtener estado de solicitud de recuperación
 */
exports.getRecoveryStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const recoveryRequest = await AccountRecoveryRequest.findByPk(requestId, {
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['username'],
          required: false
        }
      ]
    });
    
    if (!recoveryRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de recuperación no encontrada'
      });
    }
    
    const response = {
      success: true,
      data: {
        requestId: recoveryRequest.id,
        status: recoveryRequest.status,
        recoveryType: recoveryRequest.recoveryType,
        createdAt: recoveryRequest.createdAt,
        expiresAt: recoveryRequest.expiresAt,
        isExpired: recoveryRequest.isExpired(),
        daysUntilExpiry: recoveryRequest.daysUntilExpiry()
      }
    };
    
    // Agregar información adicional según estado
    switch (recoveryRequest.status) {
      case 'pending':
        response.data.message = 'Tu solicitud está pendiente de revisión';
        break;
      case 'approved':
        response.data.message = 'Tu solicitud ha sido aprobada';
        response.data.resolvedAt = recoveryRequest.resolvedAt;
        if (recoveryRequest.reviewer) {
          response.data.reviewedBy = recoveryRequest.reviewer.username;
        }
        break;
      case 'rejected':
        response.data.message = 'Tu solicitud ha sido rechazada';
        response.data.reason = recoveryRequest.reviewNotes;
        response.data.resolvedAt = recoveryRequest.resolvedAt;
        break;
      case 'expired':
        response.data.message = 'Tu solicitud ha expirado';
        break;
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('Error al obtener estado de recuperación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estado',
      error: error.message
    });
  }
};

/**
 * Listar solicitudes de recuperación (para administradores)
 */
exports.listRecoveryRequests = async (req, res) => {
  try {
    const { status, recoveryType, page = 1, limit = 10 } = req.query;
    
    const whereClause = {};
    if (status) whereClause.status = status;
    if (recoveryType) whereClause.recoveryType = recoveryType;
    
    const offset = (page - 1) * limit;
    
    const { rows: requests, count: total } = await AccountRecoveryRequest.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['username'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });
    
    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Error al listar solicitudes de recuperación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar solicitudes',
      error: error.message
    });
  }
};

/**
 * Aprobar solicitud de recuperación (administradores)
 */
exports.approveRecoveryRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { notes } = req.body;
    const reviewerId = req.user.id;
    
    const recoveryRequest = await AccountRecoveryRequest.findByPk(requestId);
    
    if (!recoveryRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de recuperación no encontrada'
      });
    }
    
    if (recoveryRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Esta solicitud ya ha sido procesada'
      });
    }
    
    // Buscar usuario
    const user = await User.findByPk(recoveryRequest.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Reactivar cuenta
    await user.update({
      accountStatus: 'active',
      privacyLevel: 'public',
      deactivatedAt: null,
      lastLogin: new Date()
    });
    
    // Aprobar solicitud
    await recoveryRequest.approve(reviewerId, notes || 'Solicitud aprobada por administrador');
    
    // Log de auditoría
    console.log(`Solicitud de recuperación aprobada: ${requestId} por usuario ${reviewerId}`);
    
    res.json({
      success: true,
      message: 'Solicitud de recuperación aprobada exitosamente',
      data: {
        requestId: recoveryRequest.id,
        userId: user.id,
        username: user.username,
        approvedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error al aprobar solicitud de recuperación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al aprobar solicitud',
      error: error.message
    });
  }
};

/**
 * Rechazar solicitud de recuperación (administradores)
 */
exports.rejectRecoveryRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    const reviewerId = req.user.id;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Razón del rechazo es requerida'
      });
    }
    
    const recoveryRequest = await AccountRecoveryRequest.findByPk(requestId);
    
    if (!recoveryRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de recuperación no encontrada'
      });
    }
    
    if (recoveryRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Esta solicitud ya ha sido procesada'
      });
    }
    
    // Rechazar solicitud
    await recoveryRequest.reject(reviewerId, reason);
    
    // Log de auditoría
    console.log(`Solicitud de recuperación rechazada: ${requestId} por usuario ${reviewerId}. Razón: ${reason}`);
    
    res.json({
      success: true,
      message: 'Solicitud de recuperación rechazada',
      data: {
        requestId: recoveryRequest.id,
        rejectedAt: new Date().toISOString(),
        reason: reason
      }
    });
    
  } catch (error) {
    console.error('Error al rechazar solicitud de recuperación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar solicitud',
      error: error.message
    });
  }
};

module.exports = exports;
