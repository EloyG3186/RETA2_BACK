const { EnrichedComment } = require('../../models/mongodb');
const mongoose = require('mongoose');
const { User } = require('../../models');
const { createNotification } = require('../notificationController');

/**
 * Crear un nuevo comentario enriquecido
 * Con mecanismo de idempotencia para evitar duplicados
 */
exports.createComment = async (req, res) => {
  try {
    const { entityType, entityId, content, formats, parentId, clientId } = req.body;
    
    // Debug logging para depurar problema de respuestas
    console.log('=== DEBUG COMENTARIO ===');
    console.log('Datos recibidos:', { entityType, entityId, content, parentId, clientId });
    console.log('parentId recibido:', parentId, typeof parentId);
    console.log('========================');
    
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
    
    // Verificar si existe un comentario con el mismo clientId (si se proporcionó)
    if (clientId) {
      console.log('Buscando comentario con clientId:', clientId);
      const existingComment = await EnrichedComment.findOne({ 
        clientId: clientId
      });
      
      if (existingComment) {
        console.log('Comentario duplicado detectado con clientId:', clientId);
        return res.status(200).json({
          success: true,
          data: existingComment,
          message: 'Comentario ya existente'
        });
      }
    }

    // Validar los datos de entrada
    if (!entityType || !entityId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: entityType, entityId, content'
      });
    }
    
    // Verificación adicional para evitar duplicados: buscar comentarios recientes idénticos
    // Definir "reciente" como comentarios creados en los últimos 5 segundos
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    
    const recentDuplicateComment = await EnrichedComment.findOne({
      userId,
      entityType,
      entityId,
      content,
      createdAt: { $gte: fiveSecondsAgo }
    });
    
    if (recentDuplicateComment) {
      console.log('Comentario duplicado detectado por contenido y tiempo:', content);
      return res.status(200).json({
        success: true,
        data: recentDuplicateComment,
        message: 'Comentario ya existente (detectado por contenido y tiempo)'
      });
    }

    // Obtener informaciÃ³n del usuario para incluirla en el comentario
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

    console.log('Verificando parentId:', parentId, 'tipo:', typeof parentId);
    if (parentId) {
      console.log('Buscando comentario padre con ID:', parentId);
      
      // Verificar si parentId es un ObjectId válido
      let objectIdParent;
      try {
        // Si es string, intentar convertir a ObjectId
        if (typeof parentId === 'string') {
          // Verificar si es un ObjectId válido de MongoDB (24 caracteres hexadecimales)
          if (mongoose.Types.ObjectId.isValid(parentId)) {
            objectIdParent = new mongoose.Types.ObjectId(parentId);
          } else {
            console.log('ADVERTENCIA: parentId no es un ObjectId válido:', parentId);
            // Si no es ObjectId válido, buscar por string directamente
            parentComment = await EnrichedComment.findOne({ _id: parentId });
          }
        } else {
          objectIdParent = parentId;
        }
        
        // Si tenemos ObjectId válido, buscar con findById
        if (objectIdParent && !parentComment) {
          parentComment = await EnrichedComment.findById(objectIdParent);
        }
        
      } catch (error) {
        console.log('Error al procesar parentId:', error.message);
        // Si hay error en conversión, intentar buscar como string
        parentComment = await EnrichedComment.findOne({ 
          $or: [
            { _id: parentId },
            { 'clientId': parentId }
          ]
        });
      }
      
      if (!parentComment) {
        console.log('ADVERTENCIA: Comentario padre no encontrado para ID:', parentId);
        console.log('Continuando creación del comentario como comentario principal...');
        // ✅ NO retornar error, continuar como comentario principal
      } else {
        console.log('✅ Comentario padre encontrado:', parentComment._id);
      }

      // Establecer el nivel de anidaciÃ³n
      level = parentComment.level + 1;
      console.log('Comentario padre encontrado. Level padre:', parentComment.level, '-> Level nuevo:', level);
      
      // Limitar la profundidad de los hilos
      if (level > 3) {
        return res.status(400).json({
          success: false,
          message: 'Se ha alcanzado el lÃ­mite mÃ¡ximo de anidaciÃ³n de comentarios'
        });
      }
    } else {
      console.log('No hay parentId, creando comentario de nivel 0');
    }

    // Procesar menciones en el contenido
    const mentionMatches = content.match(/@(\w+)/g) || [];
    const mentions = [];

    // Buscar informaciÃ³n de los usuarios mencionados
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
    console.log('Creando comentario con datos:');
    console.log('- parentId final:', parentComment ? parentComment._id : null);
    console.log('- level final:', level);
    console.log('- entityType:', entityType, 'entityId:', entityId);
    
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
      parentId: parentComment ? parentComment._id : (parentId || null),
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
      replyCount: 0,
      // Guardar el clientId si se proporcionó para evitar duplicados
      clientId: clientId || undefined
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

    // Si es una respuesta, notificar al autor del comentario padre
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
          parentEntityType: entityType,
          parentEntityId: entityId,
          content: content.substring(0, 100) + (content.length > 100 ? '...' : '')
        }
      });
    }

    res.status(201).json({
      success: true,
      data: newComment
    });
  } catch (error) {
    console.error('Error al crear comentario enriquecido:', error);
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
    const { page = 1, limit = 20, parentId = null } = req.query;

    // Validar los datos de entrada
    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parÃ¡metros requeridos: entityType, entityId'
      });
    }

    const skip = (page - 1) * limit;

    // Construir la consulta base
    const query = {
      entityType,
      entityId,
      isDeleted: false
    };

    // Si parentId es 'null' (como string), buscamos comentarios de nivel superior
    // Si parentId tiene un valor, buscamos respuestas a ese comentario especÃ­fico
    if (parentId === 'null') {
      query.parentId = null;
    } else if (parentId) {
      query.parentId = parentId;
    }

    // Contar el total de comentarios que coinciden con la consulta
    const total = await EnrichedComment.countDocuments(query);

    // Obtener los comentarios paginados
    const comments = await EnrichedComment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Obtener informaciÃ³n de usuario para cada comentario
    const populatedComments = await Promise.all(comments.map(async (comment) => {
      const user = await User.findOne({ where: { id: comment.userId } });
      
      return {
        ...comment.toObject(),
        user: user ? {
          username: user.username,
          fullName: user.fullName,
          profilePicture: user.profilePicture
        } : { username: 'Usuario eliminado' }
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
 * Obtener las respuestas de un comentario específico
 */
exports.getCommentReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    console.log('=== OBTENIENDO RESPUESTAS ===');
    console.log('commentId:', commentId);
    console.log('page:', page, 'limit:', limit, 'skip:', skip);

    // Verificar si el commentId es válido
    let objectIdComment;
    try {
      if (mongoose.Types.ObjectId.isValid(commentId)) {
        objectIdComment = new mongoose.Types.ObjectId(commentId);
      } else {
        console.log('commentId no es ObjectId válido, buscando como string');
      }
    } catch (error) {
      console.log('Error al procesar commentId:', error.message);
    }

    // Buscar todas las respuestas del comentario
    const query = objectIdComment 
      ? { parentId: objectIdComment, isDeleted: false }
      : { parentId: commentId, isDeleted: false };

    console.log('Query para buscar respuestas:', query);

    const replies = await EnrichedComment.find(query)
      .sort({ createdAt: 1 }) // Ordenar por fecha de creación ascendente
      .skip(skip)
      .limit(limit)
      .lean();

    // Contar total de respuestas
    const totalReplies = await EnrichedComment.countDocuments(query);

    console.log(`Encontradas ${replies.length} respuestas de ${totalReplies} totales`);

    res.json({
      success: true,
      data: replies,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReplies / limit),
        totalItems: totalReplies,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Error al obtener respuestas del comentario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener respuestas del comentario',
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
    const { page = 1, limit = 20 } = req.query;

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

    // Obtener informaciÃ³n del usuario del comentario principal
    const commentUser = await User.findOne({ where: { id: comment.userId } });

    // Buscar respuestas al comentario
    const skip = (page - 1) * limit;
    const repliesQuery = {
      parentId: commentId,
      isDeleted: false
    };

    const replies = await EnrichedComment.find(repliesQuery)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalReplies = await EnrichedComment.countDocuments(repliesQuery);

    // Obtener informaciÃ³n de usuario para cada respuesta
    const populatedReplies = await Promise.all(replies.map(async (reply) => {
      const user = await User.findOne({ where: { id: reply.userId } });
      
      return {
        ...reply.toObject(),
        user: user ? {
          username: user.username,
          fullName: user.fullName,
          profilePicture: user.profilePicture
        } : { username: 'Usuario eliminado' }
      };
    }));

    res.status(200).json({
      success: true,
      data: {
        comment: {
          ...comment.toObject(),
          user: commentUser ? {
            username: commentUser.username,
            fullName: commentUser.fullName,
            profilePicture: commentUser.profilePicture
          } : { username: 'Usuario eliminado' }
        },
        replies: populatedReplies,
        pagination: {
          total: totalReplies,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalReplies / limit),
          hasMore: skip + replies.length < totalReplies
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

/**
 * Actualizar un comentario
 */
exports.updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content, formats } = req.body;
    // Obtener el ID de usuario de la solicitud o usar un valor predeterminado para pruebas
    // Verificar que el usuario esté autenticado y tenga un ID válido
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado o ID de usuario inválido'
      });
    }
    const userId = req.user.id;

    // Validar los datos de entrada
    if (!commentId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: commentId, content'
      });
    }

    // Buscar el comentario
    const comment = await EnrichedComment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comentario no encontrado'
      });
    }

    // Verificar que el usuario sea el autor del comentario
    if (comment.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para editar este comentario'
      });
    }

    // Procesar menciones en el contenido actualizado
    const mentionMatches = content.match(/@(\w+)/g) || [];
    const mentions = [];

    // Buscar informaciÃ³n de los usuarios mencionados
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

    // Obtener menciones anteriores para comparar
    const previousMentions = comment.mentions || [];
    const previousMentionUserIds = previousMentions.map(m => m.userId);
    const newMentionUserIds = mentions.map(m => m.userId);

    // Encontrar nuevas menciones (usuarios que no estaban mencionados antes)
    const newMentions = mentions.filter(mention => 
      !previousMentionUserIds.includes(mention.userId) && mention.userId !== userId
    );

    // Actualizar el comentario
    comment.content = content;
    comment.formats = formats || [];
    comment.mentions = mentions;
    comment.updatedAt = new Date();

    await comment.save();

    // Obtener informaciÃ³n del usuario para incluirla en la respuesta
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'fullName', 'profilePicture']
    });

    // Crear notificaciones para las nuevas menciones
    for (const mention of newMentions) {
      await createNotification({
        type: 'mention',
        recipientId: mention.userId,
        senderId: userId,
        entityId: comment._id.toString(),
        entityType: 'comment',
        message: `${user.username} te ha mencionado en un comentario editado`,
        data: {
          commentId: comment._id.toString(),
          parentEntityType: comment.entityType,
          parentEntityId: comment.entityId,
          content: content.substring(0, 100) + (content.length > 100 ? '...' : '')
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...comment.toObject(),
        user: {
          username: user.username,
          fullName: user.fullName,
          profilePicture: user.profilePicture
        }
      }
    });
  } catch (error) {
    console.error('Error al actualizar comentario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar comentario',
      error: error.message
    });
  }
};

/**
 * Eliminar un comentario (soft delete)
 */
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    // Obtener el ID de usuario de la solicitud o usar un valor predeterminado para pruebas
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

    // Buscar el comentario
    const comment = await EnrichedComment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comentario no encontrado'
      });
    }

    // Verificar que el usuario sea el autor del comentario o un administrador
    const isAdmin = req.user.role === 'admin';
    if (comment.userId !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar este comentario'
      });
    }

    // Realizar soft delete
    comment.isDeleted = true;
    comment.content = 'Este comentario ha sido eliminado';
    comment.formats = [];
    comment.mentions = [];

    await comment.save();

    // Si el comentario tiene un padre, decrementar su contador de respuestas
    if (comment.parentId) {
      const parentComment = await EnrichedComment.findById(comment.parentId);
      if (parentComment) {
        parentComment.replyCount = Math.max(0, (parentComment.replyCount || 1) - 1);
        await parentComment.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Comentario eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar comentario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar comentario',
      error: error.message
    });
  }
};

/**
 * Agregar una reacción a un comentario
 */
exports.addReaction = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { type } = req.body;
    
    // Verificar que el usuario esté autenticado y tenga un ID válido
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado o ID de usuario inválido'
      });
    }
    const userId = req.user.id;

    // Validar los datos de entrada
    if (!commentId || !type) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: commentId, type'
      });
    }

    // Validar el tipo de reacción
    const validReactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'support'];
    if (!validReactionTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Tipo de reacción no válido. Debe ser uno de: ${validReactionTypes.join(', ')}`
      });
    }

    try {
      // Usar findOneAndUpdate para actualizar el documento de forma atómica
      // Esto evita problemas con invalidate y otras operaciones de Mongoose
      const updateResult = await EnrichedComment.findOneAndUpdate(
        { _id: commentId },
        {
          $pull: { // Primero quitar al usuario de todas las reacciones
            'reactions.like': userId,
            'reactions.love': userId,
            'reactions.haha': userId,
            'reactions.wow': userId,
            'reactions.sad': userId,
            'reactions.angry': userId,
            'reactions.support': userId
          }
        },
        { new: false } // Devuelve el documento antes de la actualización
      );

      if (!updateResult) {
        return res.status(404).json({
          success: false,
          message: 'Comentario no encontrado'
        });
      }

      // Ahora añadir la nueva reacción
      const updatedComment = await EnrichedComment.findOneAndUpdate(
        { _id: commentId },
        { $push: { [`reactions.${type}`]: userId } },
        { new: true } // Devuelve el documento actualizado
      );

      // Asegurarse de que todas las propiedades de reactions existen
      if (!updatedComment.reactions) {
        updatedComment.reactions = {
          like: [],
          love: [],
          haha: [],
          wow: [],
          sad: [],
          angry: [],
          support: []
        };
        await updatedComment.save();
      }

      // Calcular los conteos de reacciones
      const reactionCounts = {};
      validReactionTypes.forEach(reactionType => {
        const reactions = updatedComment.reactions && updatedComment.reactions[reactionType];
        reactionCounts[reactionType] = Array.isArray(reactions) ? reactions.length : 0;
      });

      // Notificar al autor del comentario si no es el mismo usuario que reacciona
      try {
        if (updatedComment.userId && updatedComment.userId !== userId) {
          // Verificar que el usuario existe antes de crear la notificación
          const user = await User.findByPk(userId, {
            attributes: ['id', 'username', 'fullName']
          });
          
          if (user) {
            // Crear la notificación solo si ambos usuarios existen
            await createNotification({
              type: 'reaction',
              recipientId: updatedComment.userId,
              senderId: userId,
              entityId: updatedComment._id.toString(),
              entityType: 'comment',
              message: `A ${user.username} le ${type === 'like' ? 'gusta' : 'ha reaccionado a'} tu comentario`,
              data: {
                commentId: updatedComment._id.toString(),
                reactionType: type,
                parentEntityType: updatedComment.entityType,
                parentEntityId: updatedComment.entityId
              }
            }).catch(err => {
              // Capturar errores en la creación de notificaciones pero no detener el flujo
              console.error('Error al crear notificación de reacción:', err);
            });
          }
        }  
      } catch (notifError) {
        // Registrar el error pero no interrumpir el flujo principal
        console.error('Error al procesar notificación de reacción:', notifError);
      }

      res.status(200).json({
        success: true,
        data: {
          commentId: updatedComment._id,
          reactionCounts,
          userReaction: type
        }
      });
    } catch (mongoError) {
      console.error('Error en operaciones de MongoDB:', mongoError);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la reacción en la base de datos',
        error: mongoError.message
      });
    }
  } catch (error) {
    console.error('Error al agregar reacción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar reacción',
      error: error.message
    });
  }
};

/**
 * Eliminar una reacción de un comentario
 */
exports.removeReaction = async (req, res) => {
  try {
    const { commentId } = req.params;
    
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

    try {
      // Primero verificar si el comentario existe y si el usuario ha reaccionado
      const comment = await EnrichedComment.findById(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Comentario no encontrado'
        });
      }

      // Verificar si el usuario ha reaccionado y con qué tipo
      const validReactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'support'];
      let hasReacted = false;
      let removedReactionType = null;
      
      // Asegurarse de que comment.reactions existe
      if (comment.reactions) {
        for (const reactionType of validReactionTypes) {
          const reactions = comment.reactions[reactionType];
          if (Array.isArray(reactions) && reactions.includes(userId)) {
            hasReacted = true;
            removedReactionType = reactionType;
            break;
          }
        }
      }

      // Si el usuario no ha reaccionado, devolver un mensaje amigable
      if (!hasReacted) {
        return res.status(200).json({
          success: true,
          message: 'No has reaccionado a este comentario',
          data: {
            commentId: comment._id,
            reactionCounts: validReactionTypes.reduce((acc, type) => {
              const reactions = comment.reactions && comment.reactions[type];
              acc[type] = Array.isArray(reactions) ? reactions.length : 0;
              return acc;
            }, {}),
            userReaction: null
          }
        });
      }

      // Usar findOneAndUpdate para eliminar la reacción de forma atómica
      const updatedComment = await EnrichedComment.findOneAndUpdate(
        { _id: commentId },
        { $pull: { [`reactions.${removedReactionType}`]: userId } },
        { new: true } // Devuelve el documento actualizado
      );

      // Calcular los conteos de reacciones
      const reactionCounts = {};
      validReactionTypes.forEach(reactionType => {
        const reactions = updatedComment.reactions && updatedComment.reactions[reactionType];
        reactionCounts[reactionType] = Array.isArray(reactions) ? reactions.length : 0;
      });

      res.status(200).json({
        success: true,
        data: {
          commentId: updatedComment._id,
          reactionCounts,
          userReaction: null,
          removedReactionType
        }
      });
    } catch (mongoError) {
      console.error('Error en operaciones de MongoDB:', mongoError);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la eliminación de reacción en la base de datos',
        error: mongoError.message
      });
    }
  } catch (error) {
    console.error('Error al eliminar reacción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar reacción',
      error: error.message
    });
  }
};

/**
 * Buscar comentarios por contenido
 */
exports.searchComments = async (req, res) => {
  try {
    const { query, entityType, entityId } = req.query;
    const { page = 1, limit = 20 } = req.query;

    // Validar los datos de entrada
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Falta el parÃ¡metro de bÃºsqueda'
      });
    }

    const skip = (page - 1) * limit;

    // Construir la consulta de bÃºsqueda
    const searchQuery = {
      content: { $regex: query, $options: 'i' },
      isDeleted: false
    };

    // Filtrar por tipo de entidad y ID si se proporcionan
    if (entityType) searchQuery.entityType = entityType;
    if (entityId) searchQuery.entityId = entityId;

    // Contar el total de resultados
    const total = await EnrichedComment.countDocuments(searchQuery);

    // Obtener los comentarios paginados
    const comments = await EnrichedComment.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Obtener informaciÃ³n de usuario para cada comentario
    const populatedComments = await Promise.all(comments.map(async (comment) => {
      const user = await User.findOne({ where: { id: comment.userId } });
      
      return {
        ...comment.toObject(),
        user: user ? {
          username: user.username,
          fullName: user.fullName,
          profilePicture: user.profilePicture
        } : { username: 'Usuario eliminado' }
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
    console.error('Error al buscar comentarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar comentarios',
      error: error.message
    });
  }
};

/**
 * Obtener las reacciones de un comentario
 */
exports.getReactions = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { type } = req.query;
    
    // Validar los datos de entrada
    if (!commentId) {
      return res.status(400).json({
        success: false,
        message: 'Falta el ID del comentario'
      });
    }

    try {
      // Buscar el comentario
      const comment = await EnrichedComment.findById(commentId);

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Comentario no encontrado'
        });
      }

      // Lista de tipos de reacción válidos
      const validReactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'support'];
      
      // Si el comentario no tiene reacciones o está mal formateado, inicializarlo
      if (!comment.reactions) {
        // Crear un objeto de reacciones vacío
        const emptyReactions = {};
        validReactionTypes.forEach(reactionType => {
          emptyReactions[reactionType] = [];
        });
        
        // Actualizar el comentario con reacciones vacías
        await EnrichedComment.findByIdAndUpdate(
          commentId,
          { $set: { reactions: emptyReactions } },
          { new: true }
        );
        
        // Devolver respuesta temprana con reacciones vacías
        return res.status(200).json({
          success: true,
          data: {
            reactions: validReactionTypes.reduce((acc, type) => {
              acc[type] = [];
              return acc;
            }, {}),
            reactionCounts: validReactionTypes.reduce((acc, type) => {
              acc[type] = 0;
              return acc;
            }, {})
          }
        });
      }

      // Asegurar que cada tipo de reacción sea un array
      let needsUpdate = false;
      const updatedReactions = { ...comment.reactions };
      
      validReactionTypes.forEach(reactionType => {
        if (!updatedReactions[reactionType] || !Array.isArray(updatedReactions[reactionType])) {
          updatedReactions[reactionType] = [];
          needsUpdate = true;
        }
      });
      
      // Si se necesita actualizar, guardar los cambios en la base de datos
      if (needsUpdate) {
        await EnrichedComment.findByIdAndUpdate(
          commentId,
          { $set: { reactions: updatedReactions } },
          { new: true }
        );
      }

      // Filtrar por tipo de reacción si se especifica
      let reactionData = {};
      if (type && validReactionTypes.includes(type)) {
        reactionData[type] = Array.isArray(comment.reactions[type]) ? 
          comment.reactions[type] : [];
      } else {
        // Si no se especifica tipo o es inválido, usar todas las reacciones
        validReactionTypes.forEach(reactionType => {
          reactionData[reactionType] = Array.isArray(comment.reactions[reactionType]) ? 
            comment.reactions[reactionType] : [];
        });
      }

      // Calcular conteos de reacciones
      const reactionCounts = {};
      validReactionTypes.forEach(reactionType => {
        const reactions = comment.reactions[reactionType];
        reactionCounts[reactionType] = Array.isArray(reactions) ? reactions.length : 0;
      });

      // Obtener información de los usuarios que reaccionaron (para los primeros 10 de cada tipo)
      const userReactions = {};
      const userIdsToFetch = new Set();
      
      Object.entries(reactionData).forEach(([reactionType, userIds]) => {
        // Asegurarse de que userIds es un array
        if (!Array.isArray(userIds)) {
          userReactions[reactionType] = [];
          return;
        }
        
        // Tomar solo los primeros 10 usuarios para cada tipo de reacción
        const userIdsToProcess = userIds.slice(0, 10);
        userIdsToProcess.forEach(userId => userIdsToFetch.add(userId));
        userReactions[reactionType] = userIdsToProcess;
      });

      // Buscar información de los usuarios
      const userIds = Array.from(userIdsToFetch);
      let users = [];
      
      if (userIds.length > 0) {
        try {
          users = await User.findAll({
            where: { id: userIds },
            attributes: ['id', 'username', 'fullName', 'profilePicture']
          });
        } catch (userError) {
          console.error('Error al buscar información de usuarios:', userError);
          // Continuar con el proceso aunque no se encuentren usuarios
        }
      }

      // Crear un mapa de usuarios para fácil acceso
      const userMap = {};
      users.forEach(user => {
        userMap[user.id] = {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          profilePicture: user.profilePicture
        };
      });

      // Mapear las reacciones con la información de los usuarios
      const reactionsWithUsers = {};
      Object.entries(userReactions).forEach(([reactionType, userIds]) => {
        if (!Array.isArray(userIds)) {
          reactionsWithUsers[reactionType] = [];
          return;
        }
        
        reactionsWithUsers[reactionType] = userIds.map(userId => ({
          userId,
          user: userMap[userId] || { username: 'Usuario desconocido' }
        }));
      });

      res.status(200).json({
        success: true,
        data: {
          reactions: reactionsWithUsers,
          reactionCounts
        }
      });
    } catch (mongoError) {
      console.error('Error en operaciones de MongoDB:', mongoError);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar las reacciones en la base de datos',
        error: mongoError.message
      });
    }
  } catch (error) {
    console.error('Error al obtener reacciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener reacciones',
      error: error.message
    });
  }
};
