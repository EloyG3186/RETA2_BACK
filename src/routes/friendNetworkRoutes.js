const express = require('express');
const router = express.Router();
const friendNetworkController = require('../controllers/mongodb/friendNetworkController');
const { authenticate } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener la red de amigos del usuario
router.get('/', friendNetworkController.getUserFriendNetwork);

// Enviar una solicitud de amistad
router.post('/request', friendNetworkController.sendFriendRequest);

// Responder a una solicitud de amistad
router.post('/request/:requestId/respond', friendNetworkController.respondToFriendRequest);

// Bloquear a un usuario
router.post('/block/:targetUserId', friendNetworkController.blockUser);

module.exports = router;
