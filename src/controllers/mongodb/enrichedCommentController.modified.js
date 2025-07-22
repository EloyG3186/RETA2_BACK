const { EnrichedComment } = require('../../models/mongodb');
const { User } = require('../../models');
const { createNotification } = require('../notificationController');

/**
 * Crear un nuevo comentario enriquecido
 */
exports.createComment = async (req, res) => {
  try {
    const { entityType, entityId, content, formats, parentId } = req.body;
    
    // Obtener el ID de usuario y verificar que está autenticado
    console.log('Recibido objeto req.user:', req.user);
    
    let userId;
    if (req.user && req.user.id) {
      userId = req.user.id;
      console.log('Usuario autenticado con ID:', userId);
    } else {
      // Proporcionar mensaje de error detallado para debugging
      console.error('Error de autenticación, req.user:', req.user);
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado o ID de usuario inválido'
      });
    }

    // Validar los datos de entrada
    if (!entityType || !entityId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: entityType, entityId, content'
      });
    }

    // Obtener información del usuario para incluirla en el comentario
    console.log('Buscando usuario con ID:', userId);
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'fullName', 'profilePicture']
    });

    if (!user) {
      console.error('Usuario no encontrado en la base de datos, ID:', userId);
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    console.log('Usuario encontrado:', user.username);

    // Verificar si es una respuesta a otro comentario
    let level = 0;
    let parentComment = null;

    if (parentId) {
      parentComment = await EnrichedComment.findById(parentId);
      
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: 'Comentario padre no encontrado'
        });
      }

      // Establecer el nivel de anidación
      level = parentComment.level + 1;
      
      // Limitar la profundidad de los hilos
      if (level > 3) {
        return res.status(400).json({
          success: false,
          message: 'Se ha alcanzado el límite máximo de anidación de comentarios'
        });
      }
    }

    // Procesar menciones en el contenido
    const mentionMatches = content.match(/@(\w+)/g) || [];
    const mentions = [];

    // Buscar información de los usuarios mencionados
    for (const mention of mentionMatches) {
      const username = mention.substring(1); // Eliminar el @
      const mentionedUser = await User.findOne({
        where: { username },
        attributes: ['id', 'username']
      });

      if (mentionedUser) {
        const startIndex = content.indexOf(mention);
        mentions.push({
          userId: mentionedUser.id,
          username: mentionedUser.username,
          startIndex,
          endIndex: startIndex + mention.length
        });
      }
    }

    // Crear el comentario enriquecido
    const newComment = new EnrichedComment({
      userId,
      user: {
        username: user.username,
        fullName: user.fullName,
        profilePicture: user.profilePicture
      },
      entityType,
      entityId,
      content,
      formats: formats || [],
      mentions,
      parentId: parentComment ? parentComment._id : null,
      level,
      reactions: {
        like: [],
        love: [],
        haha: [],
        wow: [],
        sad: [],
        angry: [],
        support: []
      },
      replyCount: 0
    });

    await newComment.save();
    console.log('Comentario guardado exitosamente con ID:', newComment._id);

    // Si es una respuesta, incrementar el contador de respuestas del comentario padre
    if (parentComment) {
      parentComment.replyCount = (parentComment.replyCount || 0) + 1;
      await parentComment.save();
    }

    // Crear notificaciones para las menciones
    for (const mention of mentions) {
      if (mention.userId !== userId) { // No notificar al autor del comentario
        await createNotification({
          type: 'mention',
          recipientId: mention.userId,
          senderId: userId,
          entityId: newComment._id.toString(),
          entityType: 'comment',
          message: `${user.username} te ha mencionado en un comentario`,
          data: {
            commentId: newComment._id.toString(),
            content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          }
        });
      }
    }

    // Notificar al autor del comentario padre si es una respuesta
    if (parentComment && parentComment.userId !== userId) {
      await createNotification({
        type: 'reply',
        recipientId: parentComment.userId,
        senderId: userId,
        entityId: newComment._id.toString(),
        entityType: 'comment',
        message: `${user.username} ha respondido a tu comentario`,
        data: {
          commentId: newComment._id.toString(),
          parentCommentId: parentComment._id.toString(),
          content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        }
      });
    }

    res.status(201).json({
      success: true,
      data: newComment
    });
  } catch (error) {
    console.error('Error al crear comentario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el comentario',
      error: error.message
    });
  }
};
