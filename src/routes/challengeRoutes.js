const express = require('express');
const challengeController = require('../controllers/challengeController');
const statsController = require('../controllers/statsController');
const evidenceController = require('../controllers/evidenceController');
const { authenticate } = require('../middlewares/authMiddleware');
const { uploadChallengeImage } = require('../middlewares/challengeUploadMiddleware');

const router = express.Router();

// Endpoint para subir imagen de desafío
router.post('/upload-image', authenticate, uploadChallengeImage, challengeController.uploadChallengeImage);

// Rutas públicas
router.get('/', challengeController.getChallenges);

// Ruta específica para desafíos del usuario
router.get('/user', authenticate, challengeController.getUserChallenges);

// Rutas protegidas
router.get('/:id', authenticate, challengeController.getChallengeById);
router.post('/', authenticate, challengeController.createChallenge);
router.put('/:id', authenticate, challengeController.updateChallenge);
router.post('/:id/join', authenticate, challengeController.joinChallenge);
router.post('/:id/winner', authenticate, challengeController.determineWinner);

// Rutas para aceptar, rechazar y cancelar desafíos
router.put('/:id/accept', authenticate, challengeController.acceptChallenge);
router.put('/:id/reject', authenticate, challengeController.rejectChallenge);
router.put('/:id/cancel', authenticate, challengeController.cancelChallenge);

// Rutas de evidencias (compatibilidad con frontend)
const { evidenceUploadMiddleware } = require('../middlewares/evidenceUploadMiddleware');
const multer = require('multer');

// Middleware para detectar si hay archivos
const detectFileMiddleware = (req, res, next) => {
  console.log('🔍 [detectFileMiddleware] Content-Type:', req.get('Content-Type'));
  console.log('🔍 [detectFileMiddleware] Body keys:', Object.keys(req.body || {}));
  
  // Si el content-type es multipart/form-data, usar el middleware de archivos
  if (req.get('Content-Type')?.includes('multipart/form-data')) {
    console.log('📤 [detectFileMiddleware] Detectado multipart/form-data, usando middleware de archivos');
    return evidenceUploadMiddleware(req, res, (err) => {
      if (err) return next(err);
      // Usar el controlador de archivos
      return evidenceController.createEvidenceWithFile(req, res);
    });
  } else {
    console.log('📝 [detectFileMiddleware] Detectado JSON, usando controlador normal');
    // Usar el controlador normal
    return evidenceController.createEvidence(req, res);
  }
};

router.get('/:id/evidences', authenticate, evidenceController.getChallengeEvidences);
// Ruta para subir evidencia con archivo
router.post('/:id/evidences/upload', authenticate, evidenceUploadMiddleware, evidenceController.createEvidenceWithFile);
// Ruta unificada que detecta el tipo de contenido
router.post('/:id/evidences', authenticate, detectFileMiddleware);

// Ruta para obtener estadu00edsticas de un desafu00edo
router.get('/:id/stats', authenticate, statsController.getChallengeStats);

module.exports = router;
