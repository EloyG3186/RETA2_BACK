const express = require('express');
const router = express.Router();
const enrichedCommentController = require('../controllers/mongodb/enrichedCommentController');

// Importar middleware de autenticación
const { authenticate } = require('../middlewares/authMiddleware');

// Aplicar middleware de autenticación a todas las rutas de comentarios
router.use(authenticate);

// Crear un nuevo comentario
router.post('/', enrichedCommentController.createComment);

// Buscar comentarios por contenido
router.get('/search', enrichedCommentController.searchComments);

// Obtener comentarios por entidad
router.get('/entity/:entityType/:entityId', enrichedCommentController.getCommentsByEntity);

// Obtener las respuestas de un comentario específico
router.get('/:commentId/replies', enrichedCommentController.getCommentReplies);

// Obtener un comentario específico con sus respuestas
router.get('/:commentId', enrichedCommentController.getCommentWithReplies);

// Actualizar un comentario
router.put('/:commentId', enrichedCommentController.updateComment);

// Eliminar un comentario
router.delete('/:commentId', enrichedCommentController.deleteComment);

// Agregar una reacción a un comentario
router.post('/:commentId/reactions', enrichedCommentController.addReaction);

// Eliminar una reacción de un comentario
router.delete('/:commentId/reactions', enrichedCommentController.removeReaction);

// Obtener las reacciones de un comentario
router.get('/:commentId/reactions', enrichedCommentController.getReactions);

module.exports = router;
