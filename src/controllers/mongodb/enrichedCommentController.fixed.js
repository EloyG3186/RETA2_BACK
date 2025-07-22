const { EnrichedComment } = require('../../models/mongodb');
const { User } = require('../../models');
const { createNotification } = require('../notificationController');

/**
 * Crear un nuevo comentario enriquecido
 */
exports.createComment = async (req, res) => {
  try {
    const { entityType, entityId, content, formats, parentId } = req.body;
    
    // Verificar que el usuario esté autenticado y tenga un ID válido
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado o ID de usuario inválido'
      });
    }
    const userId = req.user.id;

    // Validar los datos de entrada
    if (!entityType || !entityId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: entityType, entityId, content'
      });
    }

    // Obtener información del usuario para incluirla en el comentario
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'fullName', 'profilePicture']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

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
            parentEntityType: entityType,
            parentEntityId: entityId,
            content: content.substring(0, 100) + (content.length > 100 ? '...' : '')
          }
        });
      }
    }

    // Si es una respuesta a otro comentario, notificar al autor del comentario padre
    if (parentComment && parentComment.userId !== userId) {
      await createNotification({
        type: 'comment_reply',
        recipientId: parentComment.userId,
        senderId: userId,
        entityId: newComment._id.toString(),
        entityType: 'comment',
        message: `${user.username} ha respondido a tu comentario`,
        data: {
          commentId: newComment._id.toString(),
          parentCommentId: parentComment._id.toString(),
          parentEntityType: entityType,
          parentEntityId: entityId,
          content: content.substring(0, 100) + (content.length > 100 ? '...' : '')
        }
      });
    }

    // Devolver el comentario creado
    res.status(201).json({
      success: true,
      data: newComment
    });
  } catch (error) {
    console.error('Error al crear comentario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear comentario enriquecido',
      error: error.message
    });
  }
};

/**
 * Obtener comentarios por entidad
 */
exports.getCommentsByEntity = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;
    
    // Verificar que el usuario esté autenticado y tenga un ID válido
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado o ID de usuario inválido'
      });
    }
    const userId = req.user.id;

    // Validar los datos de entrada
    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros requeridos: entityType, entityId'
      });
    }

    // Configurar la paginación
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort
    };

    // Buscar comentarios de nivel superior (sin parentId)
    const filter = {
      entityType,
      entityId,
      parentId: null
    };

    // Contar el total de comentarios
    const total = await EnrichedComment.countDocuments(filter);

    // Calcular el salto para la paginación manual
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Obtener los comentarios con el salto y límite calculados
    const comments = await EnrichedComment.find(filter)
      .sort(sort.startsWith('-') ? { [sort.substring(1)]: -1 } : { [sort]: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Obtener los IDs de todos los usuarios para buscarlos de una sola vez
    const userIds = [...new Set(comments.map(comment => comment.userId))];

    // Buscar la información actualizada de los usuarios
    const users = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'username', 'fullName', 'profilePicture']
    });

    // Crear un mapa de usuarios para fácil acceso
    const userMap = {};
    users.forEach(user => {
      userMap[user.id] = user;
    });

    // Mapear los comentarios con la información actualizada de los usuarios
    const populatedComments = await Promise.all(comments.map(async comment => {
      const user = userMap[comment.userId];

      // Para cada comentario de primer nivel, obtener el número de respuestas
      const repliesCount = comment.replyCount || 0;

      return {
        ...comment.toObject(),
        user: user ? {
          username: user.username,
          fullName: user.fullName,
          profilePicture: user.profilePicture
        } : { username: 'Usuario eliminado' },
        repliesCount
      };
    }));

    res.status(200).json({
      success: true,
      data: {
        comments: populatedComments,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
          hasMore: skip + comments.length < total
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener comentarios',
      error: error.message
    });
  }
};

/**
 * Obtener un comentario específico con sus respuestas
 */
exports.getCommentWithReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 10, sort = 'createdAt' } = req.query;
    
    // Verificar que el usuario esté autenticado y tenga un ID válido
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado o ID de usuario inválido'
      });
    }
    const userId = req.user.id;

    // Validar los datos de entrada
    if (!commentId) {
      return res.status(400).json({
        success: false,
        message: 'Falta el ID del comentario'
      });
    }

    // Buscar el comentario principal
    const comment = await EnrichedComment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comentario no encontrado'
      });
    }

    // Buscar las respuestas al comentario
    const filter = {
      parentId: commentId
    };

    // Contar el total de respuestas
    const total = await EnrichedComment.countDocuments(filter);

    // Calcular el salto para la paginación manual
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Obtener las respuestas con el salto y límite calculados
    const replies = await EnrichedComment.find(filter)
      .sort(sort.startsWith('-') ? { [sort.substring(1)]: -1 } : { [sort]: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Obtener los IDs de todos los usuarios para buscarlos de una sola vez
    const userIds = [...new Set([comment.userId, ...replies.map(reply => reply.userId)])];

    // Buscar la información actualizada de los usuarios
    const users = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'username', 'fullName', 'profilePicture']
    });

    // Crear un mapa de usuarios para fácil acceso
    const userMap = {};
    users.forEach(user => {
      userMap[user.id] = user;
    });

    // Obtener la información actualizada del usuario del comentario principal
    const commentUser = userMap[comment.userId];

    // Mapear el comentario principal con la información actualizada del usuario
    const populatedComment = {
      ...comment.toObject(),
      user: commentUser ? {
        username: commentUser.username,
        fullName: commentUser.fullName,
        profilePicture: commentUser.profilePicture
      } : { username: 'Usuario eliminado' }
    };

    // Mapear las respuestas con la información actualizada de los usuarios
    const populatedReplies = replies.map(reply => {
      const user = userMap[reply.userId];

      return {
        ...reply.toObject(),
        user: user ? {
          username: user.username,
          fullName: user.fullName,
          profilePicture: user.profilePicture
        } : { username: 'Usuario eliminado' }
      };
    });

    res.status(200).json({
      success: true,
      data: {
        comment: populatedComment,
        replies: populatedReplies,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
          hasMore: skip + replies.length < total
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener comentario con respuestas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener comentario con respuestas',
      error: error.message
    });
  }
};
