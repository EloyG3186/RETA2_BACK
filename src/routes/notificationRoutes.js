const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/authMiddleware');

// Ruta de prueba para Socket.IO (sin autenticación)
router.get('/test-socket', (req, res) => {
  try {
    // Verificar si Socket.IO está disponible
    if (!global.io) {
      return res.status(500).json({
        success: false,
        message: 'Socket.IO no está configurado'
      });
    }
    
    // Enviar una notificación de prueba a todos los clientes conectados
    const testNotification = {
      id: Date.now(),
      type: 'test',
      content: 'Esta es una notificación de prueba desde Socket.IO',
      timestamp: new Date().toISOString(),
      isRead: false
    };
    
    // Emitir la notificación a todos los clientes
    global.io.emit('notification', testNotification);
    
    console.log('🔔 Notificación de prueba enviada via Socket.IO');
    
    return res.status(200).json({
      success: true,
      message: 'Notificación de prueba enviada correctamente',
      notification: testNotification,
      connectedClients: global.io.engine.clientsCount
    });
  } catch (error) {
    console.error('Error al enviar notificación de prueba:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al enviar notificación de prueba',
      error: error.message
    });
  }
});

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
