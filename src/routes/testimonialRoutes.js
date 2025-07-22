const express = require('express');
const router = express.Router();
const testimonialController = require('../controllers/mongodb/testimonialController');
const { authenticate } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener testimonios de un usuario
router.get('/user/:userId', testimonialController.getUserTestimonials);

// Crear un nuevo testimonio
router.post('/', testimonialController.createTestimonial);

// Dar like a un testimonio
router.post('/:testimonialId/like', testimonialController.likeTestimonial);

// Verificar un testimonio (solo para administradores)
router.put('/:testimonialId/verify', testimonialController.verifyTestimonial);

module.exports = router;
