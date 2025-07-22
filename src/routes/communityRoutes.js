const express = require('express');
const router = express.Router();
const communityController = require('../controllers/mongodb/communityController');
const { authenticate } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener todas las comunidades públicas
router.get('/public', communityController.getPublicCommunities);

// Obtener comunidades a las que pertenece el usuario
router.get('/my-communities', communityController.getUserCommunities);

// Obtener una comunidad específica
router.get('/:communityId', communityController.getCommunityById);

// Crear una nueva comunidad
router.post('/', communityController.createCommunity);

// Unirse a una comunidad
router.post('/:communityId/join', communityController.joinCommunity);

// Crear una publicación en la comunidad
router.post('/:communityId/posts', communityController.createPost);

module.exports = router;
