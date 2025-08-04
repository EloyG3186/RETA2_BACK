const express = require('express');
const router = express.Router();
const accountDeletionController = require('../controllers/accountDeletionController');
const accountRecoveryController = require('../controllers/accountRecoveryController');
const { authenticate, isAdmin } = require('../middlewares/authMiddleware');
const rateLimit = require('express-rate-limit');

// =====================================================
// MIDDLEWARE DE RATE LIMITING
// =====================================================

// Rate limiting para operaciones sensibles
const deletionRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 horas
  max: 1, // 1 intento por día
  message: {
    success: false,
    message: 'Solo puedes solicitar eliminación de cuenta una vez por día'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const recoveryRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 intentos por hora
  message: {
    success: false,
    message: 'Demasiados intentos de recuperación. Intenta en 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const exportRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // 5 exportaciones por hora
  message: {
    success: false,
    message: 'Límite de exportaciones alcanzado. Intenta en 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// =====================================================
// RUTAS DE ELIMINACIÓN DE CUENTA (AUTENTICADAS)
// =====================================================

/**
 * @route   GET /api/account-deletion/stats
 * @desc    Obtener estadísticas del usuario antes de eliminación
 * @access  Private
 */
router.get('/stats', authenticate, accountDeletionController.getUserStats);

/**
 * @route   GET /api/account-deletion/info
 * @desc    Obtener información sobre el proceso de eliminación
 * @access  Private
 */
router.get('/info', authenticate, accountDeletionController.getDeletionInfo);

/**
 * @route   GET /api/account-deletion/export
 * @desc    Exportar datos del usuario (GDPR compliance)
 * @access  Private
 */
router.get('/export', authenticate, exportRateLimit, accountDeletionController.exportUserData);

/**
 * @route   POST /api/account-deletion/survey
 * @desc    Enviar encuesta de salida
 * @access  Private
 */
router.post('/survey', authenticate, accountDeletionController.submitExitSurvey);

/**
 * @route   POST /api/account-deletion/deactivate
 * @desc    Desactivar cuenta (primer paso de eliminación)
 * @access  Private
 */
router.post('/deactivate', authenticate, deletionRateLimit, accountDeletionController.deactivateAccount);

// =====================================================
// RUTAS DE RECUPERACIÓN DE CUENTA (PÚBLICAS)
// =====================================================

/**
 * @route   POST /api/account-deletion/reactivate
 * @desc    Reactivar cuenta durante período de gracia
 * @access  Public
 */
router.post('/reactivate', recoveryRateLimit, accountDeletionController.reactivateAccount);

/**
 * @route   POST /api/account-deletion/recovery/request
 * @desc    Solicitar recuperación de cuenta eliminada
 * @access  Public
 */
router.post('/recovery/request', recoveryRateLimit, accountRecoveryController.requestAccountRecovery);

/**
 * @route   GET /api/account-deletion/recovery/verify/:token
 * @desc    Verificar token de recuperación
 * @access  Public
 */
router.get('/recovery/verify/:token', accountRecoveryController.verifyRecoveryToken);

/**
 * @route   POST /api/account-deletion/recovery/:requestId/documents
 * @desc    Subir documentos para recuperación verificada
 * @access  Public
 */
router.post('/recovery/:requestId/documents', accountRecoveryController.uploadRecoveryDocuments);

/**
 * @route   GET /api/account-deletion/recovery/:requestId/status
 * @desc    Obtener estado de solicitud de recuperación
 * @access  Public
 */
router.get('/recovery/:requestId/status', accountRecoveryController.getRecoveryStatus);

// =====================================================
// RUTAS ADMINISTRATIVAS (SOLO ADMINISTRADORES)
// =====================================================

/**
 * @route   GET /api/account-deletion/admin/recovery-requests
 * @desc    Listar solicitudes de recuperación
 * @access  Admin
 */
router.get('/admin/recovery-requests', authenticate, isAdmin, accountRecoveryController.listRecoveryRequests);

/**
 * @route   POST /api/account-deletion/admin/recovery/:requestId/approve
 * @desc    Aprobar solicitud de recuperación
 * @access  Admin
 */
router.post('/admin/recovery/:requestId/approve', authenticate, isAdmin, accountRecoveryController.approveRecoveryRequest);

/**
 * @route   POST /api/account-deletion/admin/recovery/:requestId/reject
 * @desc    Rechazar solicitud de recuperación
 * @access  Admin
 */
router.post('/admin/recovery/:requestId/reject', authenticate, isAdmin, accountRecoveryController.rejectRecoveryRequest);

// =====================================================
// RUTAS DE ANALYTICS (SOLO ADMINISTRADORES)
// =====================================================

/**
 * @route   GET /api/account-deletion/admin/analytics/exit-surveys
 * @desc    Obtener analytics de encuestas de salida
 * @access  Admin
 */
router.get('/admin/analytics/exit-surveys', authenticate, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { UserExitSurvey } = require('../models');
    
    const analytics = await UserExitSurvey.getAnalytics(
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error al obtener analytics de encuestas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener analytics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/account-deletion/admin/analytics/recovery-requests
 * @desc    Obtener analytics de solicitudes de recuperación
 * @access  Admin
 */
router.get('/admin/analytics/recovery-requests', authenticate, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { AccountRecoveryRequest } = require('../models');
    
    const analytics = await AccountRecoveryRequest.getAnalytics(
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error al obtener analytics de recuperación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener analytics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/account-deletion/admin/audit-trail
 * @desc    Obtener registros de auditoría
 * @access  Admin
 */
router.get('/admin/audit-trail', authenticate, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, deletionType, startDate, endDate } = req.query;
    const { UserAuditTrail } = require('../models');
    const { Op } = require('sequelize');
    
    const whereClause = {};
    if (deletionType) whereClause.deletionType = deletionType;
    if (startDate && endDate) {
      whereClause.accountDeletedAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    const offset = (page - 1) * limit;
    
    const { rows: auditRecords, count: total } = await UserAuditTrail.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });
    
    res.json({
      success: true,
      data: {
        auditRecords,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener registros de auditoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener registros de auditoría',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/account-deletion/admin/legal-holds
 * @desc    Obtener retenciones legales activas
 * @access  Admin
 */
router.get('/admin/legal-holds', authenticate, isAdmin, async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    const { UserLegalHold } = require('../models');
    
    const legalHolds = await UserLegalHold.findAll({
      where: { status },
      include: [
        {
          model: require('../models').User,
          as: 'user',
          attributes: ['username', 'email'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: legalHolds
    });
  } catch (error) {
    console.error('Error al obtener retenciones legales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener retenciones legales',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/account-deletion/admin/legal-holds
 * @desc    Crear retención legal
 * @access  Admin
 */
router.post('/admin/legal-holds', authenticate, isAdmin, async (req, res) => {
  try {
    const { userId, caseReference, holdReason, requestedBy, contactInfo, holdUntil } = req.body;
    const { UserLegalHold } = require('../models');
    
    if (!userId || !holdReason) {
      return res.status(400).json({
        success: false,
        message: 'userId y holdReason son requeridos'
      });
    }
    
    const legalHold = await UserLegalHold.createHold({
      userId,
      caseReference,
      holdReason,
      requestedBy,
      contactInfo,
      holdUntil: holdUntil ? new Date(holdUntil) : null
    });
    
    res.json({
      success: true,
      message: 'Retención legal creada exitosamente',
      data: legalHold
    });
  } catch (error) {
    console.error('Error al crear retención legal:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear retención legal',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/account-deletion/admin/legal-holds/:holdId/release
 * @desc    Liberar retención legal
 * @access  Admin
 */
router.post('/admin/legal-holds/:holdId/release', authenticate, isAdmin, async (req, res) => {
  try {
    const { holdId } = req.params;
    const { UserLegalHold } = require('../models');
    
    const releasedHold = await UserLegalHold.releaseHold(holdId, req.user.username);
    
    res.json({
      success: true,
      message: 'Retención legal liberada exitosamente',
      data: releasedHold
    });
  } catch (error) {
    console.error('Error al liberar retención legal:', error);
    res.status(500).json({
      success: false,
      message: 'Error al liberar retención legal',
      error: error.message
    });
  }
});

// =====================================================
// MIDDLEWARE DE MANEJO DE ERRORES
// =====================================================

router.use((error, req, res, next) => {
  console.error('Error en rutas de eliminación de cuenta:', error);
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
  });
});

module.exports = router;
