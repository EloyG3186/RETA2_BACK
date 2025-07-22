const express = require('express');
const router = express.Router();
const chatController = require('../controllers/mongodb/chatController');
const { authenticate } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener todas las conversaciones del usuario
router.get('/', chatController.getUserChats);

// Obtener una conversación específica
router.get('/:chatId', chatController.getChatById);

// Crear una nueva conversación
router.post('/', chatController.createChat);

// Enviar un mensaje a una conversación
router.post('/:chatId/messages', chatController.sendMessage);

// Marcar mensajes como leídos
router.put('/:chatId/read', chatController.markMessagesAsRead);

module.exports = router;
