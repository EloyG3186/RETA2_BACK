const express = require('express');
const router = express.Router();
const gamificationController = require('../controllers/gamificationController');
const authMiddleware = require('../middlewares/authMiddleware');

// Todas las rutas de gamificación requieren autenticación
router.use(authMiddleware.authenticate);

// Rutas para puntos y niveles
router.get('/points', gamificationController.getUserPoints);

// Rutas para insignias
router.get('/badges', gamificationController.getUserBadges);
router.get('/badges/all', gamificationController.getAllBadges);

// Rutas para tabla de clasificación
router.get('/leaderboard', gamificationController.getLeaderboard);
router.get('/rank', gamificationController.getUserRank);

module.exports = router;
