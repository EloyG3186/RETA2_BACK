const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/authMiddleware');

// Todas las rutas de notificaciones requieren autenticación
router.use(authenticate);

// Obtener notificaciones del usuario
router.get('/', notificationController.getUserNotifications);

// Marcar notificación como leída
router.put('/:id/read', notificationController.markAsRead);

// Marcar todas las notificaciones como leídas
router.put('/read-all', notificationController.markAllAsRead);

// Eliminar una notificación
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
