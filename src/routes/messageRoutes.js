const express = require('express');
const router = express.Router();
const chatController = require('../controllers/mongodb/chatController');
const { authenticate } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener todas las conversaciones del usuario (alias para /api/messages/conversations)
router.get('/conversations', chatController.getUserChats);

// Obtener una conversación específica
router.get('/conversations/:chatId', chatController.getChatById);

// Crear una nueva conversación
router.post('/conversations', chatController.createChat);

// Enviar un mensaje a una conversación
router.post('/conversations/:chatId/messages', chatController.sendMessage);

// Marcar mensajes como leídos
router.put('/conversations/:chatId/read', chatController.markMessagesAsRead);

module.exports = router;
