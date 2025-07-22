const express = require('express');
const statsController = require('../controllers/statsController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Todas las rutas de estadísticas requieren autenticación
router.use(authenticate);

// Rutas para estadísticas
router.get('/challenge/:challengeId', statsController.getChallengeStats);
router.get('/user', statsController.getUserStats);

module.exports = router;
