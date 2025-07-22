const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');
const { uploadChallengeImage } = require('../middlewares/challengeUploadMiddleware');
const { uploadAvatar } = require('../middlewares/uploadMiddleware');

const router = express.Router();

// Endpoint general para subir imágenes (usando el middleware de avatares como fallback)
router.post('/image', authenticate, uploadAvatar, (req, res) => {
  try {
    console.log('🖼️ [uploadRoutes] /image - Procesando subida general de imagen...');
    
    if (!req.file) {
      console.log('❌ [uploadRoutes] No se recibió archivo');
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ningún archivo',
        code: 'NO_FILE'
      });
    }

    console.log('✅ [uploadRoutes] Imagen subida exitosamente:');
    console.log('   📄 Archivo:', req.file.filename);
    console.log('   📄 Original:', req.file.originalname);
    console.log('   📏 Tamaño:', req.file.size, 'bytes');

    // Generar URL pública para la imagen
    const imageUrl = `/uploads/avatars/${req.file.filename}`;
    console.log('   🌐 URL pública:', imageUrl);

    // Responder con la información de la imagen
    res.json({
      success: true,
      message: 'Imagen subida exitosamente',
      imageUrl: imageUrl,
      url: imageUrl, // Alias para compatibilidad
      data: {
        imageUrl: imageUrl,
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });

  } catch (error) {
    console.error('❌ [uploadRoutes] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al procesar la imagen',
      error: error.message
    });
  }
});

module.exports = router;
