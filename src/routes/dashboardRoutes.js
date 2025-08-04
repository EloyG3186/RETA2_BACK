const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener datos consolidados del dashboard
router.get('/', dashboardController.getDashboardDataReal);

// Endpoint temporal para debugging
router.get('/debug-points', dashboardController.debugUserPoints);

// Endpoint de prueba simple
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'ENDPOINT DE PRUEBA FUNCIONANDO',
    data: {
      level: 999,
      test: true,
      timestamp: new Date().toISOString()
    }
  });
});

// Obtener estadísticas específicas del usuario
// router.get('/stats', dashboardController.getUserStats); // TODO: Implementar función getUserStats

module.exports = router;
