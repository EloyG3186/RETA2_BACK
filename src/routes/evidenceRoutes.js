const express = require('express');
const router = express.Router();
const evidenceController = require('../controllers/evidenceController');
const { authenticate } = require('../middlewares/authMiddleware');

// Rutas para evidencias
// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener todas las evidencias de un desafío
router.get('/challenges/:challengeId/evidences', evidenceController.getChallengeEvidences);

// Crear una nueva evidencia para un desafío
router.post('/challenges/:challengeId/evidences', evidenceController.createEvidence);

// Obtener una evidencia específica
router.get('/:evidenceId', evidenceController.getEvidenceById);

// Actualizar el estado de una evidencia (aprobar/rechazar)
router.put('/:evidenceId/status', evidenceController.updateEvidenceStatus);

// Eliminar una evidencia
router.delete('/:evidenceId', evidenceController.deleteEvidence);

module.exports = router;
