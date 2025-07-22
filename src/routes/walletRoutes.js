const express = require('express');
const walletController = require('../controllers/walletController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Todas las rutas de wallet requieren autenticación
router.use(authenticate);

// Rutas para billetera
router.get('/', walletController.getWallet);
router.post('/deposit', walletController.deposit);
router.post('/withdraw', walletController.withdraw);
router.get('/transactions', walletController.getTransactions);
router.get('/rewards', walletController.getRewards);

module.exports = router;
