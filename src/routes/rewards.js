const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/rewardController');
const { authenticate, isAdmin } = require('../middlewares/authMiddleware');

// Rutas públicas para usuarios (requieren autenticación)
router.use(authenticate); // Aplicar middleware de autenticación a todas las rutas

// Obtener reglas de recompensas activas
router.get('/rules', rewardController.getRewardRules);

// Obtener historial de puntos del usuario actual
router.get('/history', rewardController.getPointHistory);

// === RUTAS DE ADMINISTRACIÓN ===
// Obtener todas las reglas (activas e inactivas) - Solo admin
router.get('/admin/rules', isAdmin, rewardController.getAllRewardRules);

// Crear nueva regla de recompensa - Solo admin
router.post('/admin/rules', isAdmin, rewardController.createRewardRule);

// Actualizar regla de recompensa - Solo admin
router.put('/admin/rules/:id', isAdmin, rewardController.updateRewardRule);

// Eliminar regla de recompensa - Solo admin
router.delete('/admin/rules/:id', isAdmin, rewardController.deleteRewardRule);

// Obtener estadísticas de puntos - Solo admin
router.get('/admin/stats', isAdmin, rewardController.getPointsStats);

module.exports = router;
