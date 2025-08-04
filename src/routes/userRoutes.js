const express = require('express');
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { uploadAvatar } = require('../middlewares/uploadMiddleware');

const router = express.Router();

// Rutas públicas
router.post('/register', userController.register);
router.post('/login', userController.login);
router.get('/verify-email/:token', userController.verifyEmail);
router.get('/verify-email-by-email/:email', userController.verifyEmailByEmail); // Ruta para desarrollo
router.get('/debug-user/:email', userController.debugUser); // Ruta para depuración (solo desarrollo)
router.get('/dev-login/:email', userController.devLogin); // Ruta para inicio de sesión directo (solo desarrollo)
router.get('/reset-password/:email/:newPassword', userController.resetPassword); // Ruta para restablecer contraseña (solo desarrollo)
router.post('/resend-verification', userController.resendVerificationEmail);

// Rutas protegidas
router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, uploadAvatar, userController.updateProfile);
router.post('/profile', authenticate, uploadAvatar, userController.updateProfile); // Añadiendo ruta POST para compatibilidad
router.put('/password', authenticate, userController.changePassword);
router.get('/friends', authenticate, userController.getFriends);
router.get('/non-friends', authenticate, userController.getNonFriends);
router.get('/common-friends', authenticate, userController.getCommonFriends);
router.get('/search', authenticate, userController.searchUsers);
router.post('/by-ids', authenticate, userController.getUsersByIds);
router.get('/:userId/recommendations', authenticate, userController.getRecommendations);

// Rutas para administradores
// Ejemplo: router.get('/all', authenticate, authorize(['admin']), userController.getAllUsers);

module.exports = router;
