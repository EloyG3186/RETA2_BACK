const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const authMiddleware = require('../middlewares/authMiddleware');

// Todas las rutas de actividad requieren autenticación
router.use(authMiddleware.authenticate);

// Rutas para actividad del usuario
router.get('/user/recent', activityController.getRecentActivity);
router.get('/user/history', activityController.getActivityHistory);

module.exports = router;
