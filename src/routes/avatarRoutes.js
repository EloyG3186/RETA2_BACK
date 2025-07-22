const express = require('express');
const avatarController = require('../controllers/avatarController');
const { authenticate } = require('../middlewares/authMiddleware');
const { uploadAvatar } = require('../middlewares/uploadMiddleware');

const router = express.Router();

// Ruta para subir avatar (protegida)
router.post('/upload', authenticate, (req, res, next) => {
  uploadAvatar(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: `Error al subir avatar: ${err.message}`
      });
    }
    next();
  });
}, avatarController.uploadAvatar);

// Ruta para obtener avatar por nombre de archivo (pública)
router.get('/:filename', avatarController.getAvatar);

module.exports = router;
