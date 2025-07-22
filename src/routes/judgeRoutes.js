const express = require('express');
const router = express.Router();
const judgeController = require('../controllers/judgeController');
const { authenticate } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Asignar un juez a un desafío
router.post('/challenges/:id/assign-judge', judgeController.assignJudge);

// Aceptar asignación como juez
router.post('/challenges/:id/accept-assignment', judgeController.acceptJudgeAssignment);

// Rechazar asignación como juez
router.post('/challenges/:id/reject-assignment', judgeController.rejectJudgeAssignment);

// Emitir veredicto como juez
router.post('/challenges/:id/verdict', judgeController.judgeVerdict);

// Solicitar revisión de juez
router.post('/challenges/:id/request-judging', judgeController.requestJudging);

// Congelar el premio de un desafío
router.post('/challenges/:id/freeze-prize', judgeController.freezePrize);

module.exports = router;
