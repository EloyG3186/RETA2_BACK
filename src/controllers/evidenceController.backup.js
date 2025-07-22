const { Evidence, Challenge, User, sequelize, TimelineEvent } = require('../models');
const notificationController = require('./notificationController');

// Crear una nueva evidencia
exports.createEvidence = async (req, res) => {
  console.log('🚀 [createEvidence] INICIO - Función createEvidence llamada');
  console.log('🚀 [createEvidence] Método:', req.method);
  console.log('🚀 [createEvidence] URL:', req.originalUrl);
  console.log('🚀 [createEvidence] Params:', req.params);
  console.log('🚀 [createEvidence] Body:', req.body);
  
  const transaction = await sequelize.transaction();
  
  try {
    // Aceptar tanto challengeId como id para compatibilidad con diferentes rutas
    const challengeId = req.params.challengeId || req.params.id;
    const { description, fileUrl, fileType } = req.body;
    const userId = req.user.id;
    
    console.log(`📤 [createEvidence] Creando evidencia para desafío ${challengeId} por usuario ${userId}`);
    console.log(`📤 [createEvidence] Datos recibidos:`, { description, fileUrl, fileType });

    // Verificar que el desafu00edo existe
    const challenge = await Challenge.findByPk(challengeId);
    if (!challenge) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Desafu00edo no encontrado'
      });
    }

    // Verificar que el usuario es participante del desafu00edo
    const isParticipant = challenge.creatorId === userId || challenge.challenger === userId;
    if (!isParticipant) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para au00f1adir evidencias a este desafu00edo'
      });
    }

    // Verificar que el desafu00edo estu00e1 en progreso
    if (challenge.status !== 'in_progress') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden au00f1adir evidencias a desafu00edos en progreso'
      });
    }

    // Crear la evidencia
    const evidence = await Evidence.create({
      challengeId,
      userId,
      description,
      fileUrl,
      fileType,
      timestamp: new Date(),
      status: 'pending'
    }, { transaction });

    // Crear evento de timeline para la evidencia enviada
    await TimelineEvent.create({
      challengeId,
      type: 'evidence_submitted',
      description: `${user?.fullName || user?.username || 'Usuario'} (${user?.username || 'N/A'}) subió nueva evidencia: ${description || 'Sin descripción'}`
    }, { transaction });

    // Crear notificación para el oponente (el que no subió la evidencia)
    const opponentId = challenge.creatorId === userId ? challenge.challengerId : challenge.creatorId;
    if (opponentId) {
      try {
        await notificationController.createNotification(
          opponentId,
          'evidence_submitted',
          `${user?.fullName || user?.username || 'Tu oponente'} ha subido nueva evidencia en el desafío: "${challenge.title}"`,
          challengeId
        );
        console.log(`Notificación enviada al oponente ${opponentId} - nueva evidencia`);
      } catch (notifError) {
        console.error('Error al crear notificación de evidencia:', notifError);
        // No interrumpimos el flujo principal si falla la notificación
      }
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Evidencia creada con éxito',
      data: evidence
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al crear evidencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la evidencia',
      error: error.message
    });
  }
};

// Crear evidencia con archivo subido
exports.createEvidenceWithFile = async (req, res) => {
  console.log('🚀 [createEvidenceWithFile] INICIO - Función createEvidenceWithFile llamada');
  console.log('🚀 [createEvidenceWithFile] Método:', req.method);
  console.log('🚀 [createEvidenceWithFile] URL:', req.originalUrl);
  console.log('🚀 [createEvidenceWithFile] Params:', req.params);
  console.log('🚀 [createEvidenceWithFile] Body:', req.body);
  console.log('🚀 [createEvidenceWithFile] Archivo:', req.evidenceFile);
  
  const transaction = await sequelize.transaction();
  
  try {
    // Aceptar tanto challengeId como id para compatibilidad con diferentes rutas
    const challengeId = req.params.challengeId || req.params.id;
    const { description } = req.body;
    const userId = req.user.id;
    
    console.log(`📤 [createEvidenceWithFile] Creando evidencia con archivo para desafío ${challengeId} por usuario ${userId}`);
    console.log(`📤 [createEvidenceWithFile] Descripción:`, description);
    console.log(`📤 [createEvidenceWithFile] Archivo:`, req.evidenceFile);

    // Verificar que el desafío existe
    const challenge = await Challenge.findByPk(challengeId);
    if (!challenge) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Desafío no encontrado'
      });
    }

    // Verificar que el usuario es participante del desafío
    const user = await User.findByPk(userId);
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Crear la evidencia con la información del archivo
    const evidence = await Evidence.create({
      challengeId,
      userId,
      description: description || 'Evidencia subida',
      fileUrl: req.evidenceFile.url,
      fileType: req.evidenceFile.mimetype,
      fileName: req.evidenceFile.originalname,
      fileSize: req.evidenceFile.size,
      status: 'pending'
    }, { transaction });

    console.log(`✅ [createEvidenceWithFile] Evidencia creada con ID: ${evidence.id}`);

    // Crear evento en el timeline
    const timelineEvent = await TimelineEvent.create({
      challengeId,
      type: 'evidence_submitted',
      description: `${user.fullName} (${user.username}) subió nueva evidencia: ${description || req.evidenceFile.originalname}`,
      timestamp: new Date()
    }, { transaction });

    console.log(`📋 [createEvidenceWithFile] Evento de timeline creado: ${timelineEvent.id}`);

    // Determinar quién es el oponente para enviar notificación
    let opponentId;
    if (challenge.creatorId === userId) {
      opponentId = challenge.challengerId;
    } else {
      opponentId = challenge.creatorId;
    }

    // Enviar notificación al oponente
    if (opponentId) {
      try {
        await notificationController.createNotification({
          userId: opponentId,
          type: 'evidence_submitted',
          title: 'Nueva evidencia subida',
          message: `${user.fullName} (${user.username}) ha subido una nueva evidencia en el desafío "${challenge.title}"`,
          relatedId: challengeId,
          relatedType: 'challenge'
        });
        console.log(`🔔 [createEvidenceWithFile] Notificación enviada al oponente: ${opponentId}`);
      } catch (notifError) {
        console.error('⚠️ [createEvidenceWithFile] Error al enviar notificación:', notifError);
      }
    }

    await transaction.commit();

    // Responder con la evidencia creada
    res.status(201).json({
      success: true,
      message: 'Evidencia subida exitosamente',
      data: {
        id: evidence.id,
        challengeId: evidence.challengeId,
        userId: evidence.userId,
        description: evidence.description,
        fileUrl: evidence.fileUrl,
        fileType: evidence.fileType,
        fileName: evidence.fileName,
        fileSize: evidence.fileSize,
        status: evidence.status,
        createdAt: evidence.createdAt,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          profilePicture: user.profilePicture
        }
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ [createEvidenceWithFile] Error al crear evidencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la evidencia',
      error: error.message
    });
  }
};

// Obtener todas las evidencias de un desafío
exports.getChallengeEvidences = async (req, res) => {
  try {
    // Aceptar tanto challengeId como id para compatibilidad con diferentes rutas
    const challengeId = req.params.challengeId || req.params.id;

    // Verificar que el desafu00edo existe
    const challenge = await Challenge.findByPk(challengeId);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Desafu00edo no encontrado'
      });
    }

    // Obtener todas las evidencias del desafu00edo
    const evidences = await Evidence.findAll({
      where: { challengeId },
      include: [{
        model: User,
        as: 'submitter',
        attributes: ['id', 'name', 'avatar']
      }],
      order: [['timestamp', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: evidences
    });
  } catch (error) {
    console.error('Error al obtener evidencias:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las evidencias',
      error: error.message
    });
  }
};

// Crear evidencia con archivo subido
exports.createEvidenceWithFile = async (req, res) => {
  console.log('🚀 [createEvidenceWithFile] INICIO - Función createEvidenceWithFile llamada');
  console.log('🚀 [createEvidenceWithFile] Método:', req.method);
  console.log('🚀 [createEvidenceWithFile] URL:', req.originalUrl);
  console.log('🚀 [createEvidenceWithFile] Params:', req.params);
  console.log('🚀 [createEvidenceWithFile] Body:', req.body);
  console.log('🚀 [createEvidenceWithFile] Archivo:', req.evidenceFile);
  
  const transaction = await sequelize.transaction();
  
  try {
    // Aceptar tanto challengeId como id para compatibilidad con diferentes rutas
    const challengeId = req.params.challengeId || req.params.id;
    const { description } = req.body;
    const userId = req.user.id;
    
    console.log(`📤 [createEvidenceWithFile] Creando evidencia con archivo para desafío ${challengeId} por usuario ${userId}`);
    console.log(`📤 [createEvidenceWithFile] Descripción:`, description);
    console.log(`📤 [createEvidenceWithFile] Archivo:`, req.evidenceFile);

    // Verificar que el desafío existe
    const challenge = await Challenge.findByPk(challengeId);
    if (!challenge) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Desafío no encontrado'
      });
    }

    // Verificar que el usuario es participante del desafío
    const user = await User.findByPk(userId);
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Crear la evidencia con la información del archivo
    const evidence = await Evidence.create({
      challengeId,
      userId,
      description: description || 'Evidencia subida',
      fileUrl: req.evidenceFile.url,
      fileType: req.evidenceFile.mimetype,
      fileName: req.evidenceFile.originalname,
      fileSize: req.evidenceFile.size,
      status: 'pending'
    }, { transaction });

    console.log(`✅ [createEvidenceWithFile] Evidencia creada con ID: ${evidence.id}`);

    // Crear evento en el timeline
    const timelineEvent = await TimelineEvent.create({
      challengeId,
      type: 'evidence_submitted',
      description: `${user.fullName} (${user.username}) subió nueva evidencia: ${description || req.evidenceFile.originalname}`,
      timestamp: new Date()
    }, { transaction });

    console.log(`📋 [createEvidenceWithFile] Evento de timeline creado: ${timelineEvent.id}`);

    // Determinar quién es el oponente para enviar notificación
    let opponentId;
    if (challenge.creatorId === userId) {
      opponentId = challenge.challengerId;
    } else {
      opponentId = challenge.creatorId;
    }

    // Enviar notificación al oponente
    if (opponentId) {
      try {
        await notificationController.createNotification({
          userId: opponentId,
          type: 'evidence_submitted',
          title: 'Nueva evidencia subida',
          message: `${user.fullName} (${user.username}) ha subido una nueva evidencia en el desafío "${challenge.title}"`,
          relatedId: challengeId,
          relatedType: 'challenge'
        });
        console.log(`🔔 [createEvidenceWithFile] Notificación enviada al oponente: ${opponentId}`);
      } catch (notifError) {
        console.error('⚠️ [createEvidenceWithFile] Error al enviar notificación:', notifError);
      }
    }

    await transaction.commit();

    // Responder con la evidencia creada
    res.status(201).json({
      success: true,
      message: 'Evidencia subida exitosamente',
      data: {
        id: evidence.id,
        challengeId: evidence.challengeId,
        userId: evidence.userId,
        description: evidence.description,
        fileUrl: evidence.fileUrl,
        fileType: evidence.fileType,
        fileName: evidence.fileName,
        fileSize: evidence.fileSize,
        status: evidence.status,
        createdAt: evidence.createdAt,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          profilePicture: user.profilePicture
        }
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ [createEvidenceWithFile] Error al crear evidencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la evidencia',
      error: error.message
    });
  }
};

// Obtener una evidencia especu00edfica
exports.getEvidenceById = async (req, res) => {
  try {
    const { evidenceId } = req.params;

    const evidence = await Evidence.findByPk(evidenceId, {
      include: [{
        model: User,
        as: 'submitter',
        attributes: ['id', 'name', 'avatar']
      }]
    });

    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidencia no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: evidence
    });
  } catch (error) {
    console.error('Error al obtener evidencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la evidencia',
      error: error.message
    });
  }
};

// Crear evidencia con archivo subido
exports.createEvidenceWithFile = async (req, res) => {
  console.log('🚀 [createEvidenceWithFile] INICIO - Función createEvidenceWithFile llamada');
  console.log('🚀 [createEvidenceWithFile] Método:', req.method);
  console.log('🚀 [createEvidenceWithFile] URL:', req.originalUrl);
  console.log('🚀 [createEvidenceWithFile] Params:', req.params);
  console.log('🚀 [createEvidenceWithFile] Body:', req.body);
  console.log('🚀 [createEvidenceWithFile] Archivo:', req.evidenceFile);
  
  const transaction = await sequelize.transaction();
  
  try {
    // Aceptar tanto challengeId como id para compatibilidad con diferentes rutas
    const challengeId = req.params.challengeId || req.params.id;
    const { description } = req.body;
    const userId = req.user.id;
    
    console.log(`📤 [createEvidenceWithFile] Creando evidencia con archivo para desafío ${challengeId} por usuario ${userId}`);
    console.log(`📤 [createEvidenceWithFile] Descripción:`, description);
    console.log(`📤 [createEvidenceWithFile] Archivo:`, req.evidenceFile);

    // Verificar que el desafío existe
    const challenge = await Challenge.findByPk(challengeId);
    if (!challenge) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Desafío no encontrado'
      });
    }

    // Verificar que el usuario es participante del desafío
    const user = await User.findByPk(userId);
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Crear la evidencia con la información del archivo
    const evidence = await Evidence.create({
      challengeId,
      userId,
      description: description || 'Evidencia subida',
      fileUrl: req.evidenceFile.url,
      fileType: req.evidenceFile.mimetype,
      fileName: req.evidenceFile.originalname,
      fileSize: req.evidenceFile.size,
      status: 'pending'
    }, { transaction });

    console.log(`✅ [createEvidenceWithFile] Evidencia creada con ID: ${evidence.id}`);

    // Crear evento en el timeline
    const timelineEvent = await TimelineEvent.create({
      challengeId,
      type: 'evidence_submitted',
      description: `${user.fullName} (${user.username}) subió nueva evidencia: ${description || req.evidenceFile.originalname}`,
      timestamp: new Date()
    }, { transaction });

    console.log(`📋 [createEvidenceWithFile] Evento de timeline creado: ${timelineEvent.id}`);

    // Determinar quién es el oponente para enviar notificación
    let opponentId;
    if (challenge.creatorId === userId) {
      opponentId = challenge.challengerId;
    } else {
      opponentId = challenge.creatorId;
    }

    // Enviar notificación al oponente
    if (opponentId) {
      try {
        await notificationController.createNotification({
          userId: opponentId,
          type: 'evidence_submitted',
          title: 'Nueva evidencia subida',
          message: `${user.fullName} (${user.username}) ha subido una nueva evidencia en el desafío "${challenge.title}"`,
          relatedId: challengeId,
          relatedType: 'challenge'
        });
        console.log(`🔔 [createEvidenceWithFile] Notificación enviada al oponente: ${opponentId}`);
      } catch (notifError) {
        console.error('⚠️ [createEvidenceWithFile] Error al enviar notificación:', notifError);
      }
    }

    await transaction.commit();

    // Responder con la evidencia creada
    res.status(201).json({
      success: true,
      message: 'Evidencia subida exitosamente',
      data: {
        id: evidence.id,
        challengeId: evidence.challengeId,
        userId: evidence.userId,
        description: evidence.description,
        fileUrl: evidence.fileUrl,
        fileType: evidence.fileType,
        fileName: evidence.fileName,
        fileSize: evidence.fileSize,
        status: evidence.status,
        createdAt: evidence.createdAt,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          profilePicture: user.profilePicture
        }
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ [createEvidenceWithFile] Error al crear evidencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la evidencia',
      error: error.message
    });
  }
};

// Actualizar el estado de una evidencia (aprobar/rechazar)
exports.updateEvidenceStatus = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { evidenceId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    // Verificar que el estado es vu00e1lido
    if (!['approved', 'rejected'].includes(status)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Estado no vu00e1lido. Debe ser "approved" o "rejected"'
      });
    }

    // Obtener la evidencia
    const evidence = await Evidence.findByPk(evidenceId, {
      include: [{
        model: Challenge,
        as: 'challenge'
      }]
    });

    if (!evidence) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Evidencia no encontrada'
      });
    }

    // Verificar que el usuario es el creador del desafu00edo o el retador (pero no el que subiu00f3 la evidencia)
    const challenge = evidence.challenge;
    const isOpponent = 
      (challenge.creatorId === userId && evidence.userId !== userId) || 
      (challenge.challenger === userId && evidence.userId !== userId);

    if (!isOpponent) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar esta evidencia'
      });
    }

    // Actualizar el estado de la evidencia
    evidence.status = status;
    await evidence.save({ transaction });

    // Obtener información del usuario que actualiza
    const user = await User.findByPk(userId, {
      attributes: ['fullName', 'username']
    }, { transaction });

    // Crear evento de timeline para la evidencia actualizada
    await TimelineEvent.create({
      challengeId: evidence.challengeId,
      type: 'evidence_submitted',
      description: `${user?.fullName || user?.username || 'Usuario'} (${user?.username || 'N/A'}) ${status === 'approved' ? 'aprobó' : 'rechazó'} la evidencia: ${evidence.description || 'Sin descripción'}`
    }, { transaction });

    // Crear notificación para el usuario que subió la evidencia
    try {
      await notificationController.createNotification(
        evidence.userId,
        'evidence_submitted',
        `Tu evidencia ha sido ${status === 'approved' ? 'aprobada' : 'rechazada'} en el desafío: "${challenge.title}"`,
        evidence.challengeId
      );
      console.log(`Notificación enviada al usuario ${evidence.userId} - evidencia ${status}`);
    } catch (notifError) {
      console.error('Error al crear notificación de evidencia actualizada:', notifError);
      // No interrumpimos el flujo principal si falla la notificación
    }

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: `Evidencia ${status === 'approved' ? 'aprobada' : 'rechazada'} con u00e9xito`,
      data: evidence
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al actualizar evidencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la evidencia',
      error: error.message
    });
  }
};

// Crear evidencia con archivo subido
exports.createEvidenceWithFile = async (req, res) => {
  console.log('🚀 [createEvidenceWithFile] INICIO - Función createEvidenceWithFile llamada');
  console.log('🚀 [createEvidenceWithFile] Método:', req.method);
  console.log('🚀 [createEvidenceWithFile] URL:', req.originalUrl);
  console.log('🚀 [createEvidenceWithFile] Params:', req.params);
  console.log('🚀 [createEvidenceWithFile] Body:', req.body);
  console.log('🚀 [createEvidenceWithFile] Archivo:', req.evidenceFile);
  
  const transaction = await sequelize.transaction();
  
  try {
    // Aceptar tanto challengeId como id para compatibilidad con diferentes rutas
    const challengeId = req.params.challengeId || req.params.id;
    const { description } = req.body;
    const userId = req.user.id;
    
    console.log(`📤 [createEvidenceWithFile] Creando evidencia con archivo para desafío ${challengeId} por usuario ${userId}`);
    console.log(`📤 [createEvidenceWithFile] Descripción:`, description);
    console.log(`📤 [createEvidenceWithFile] Archivo:`, req.evidenceFile);

    // Verificar que el desafío existe
    const challenge = await Challenge.findByPk(challengeId);
    if (!challenge) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Desafío no encontrado'
      });
    }

    // Verificar que el usuario es participante del desafío
    const user = await User.findByPk(userId);
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Crear la evidencia con la información del archivo
    const evidence = await Evidence.create({
      challengeId,
      userId,
      description: description || 'Evidencia subida',
      fileUrl: req.evidenceFile.url,
      fileType: req.evidenceFile.mimetype,
      fileName: req.evidenceFile.originalname,
      fileSize: req.evidenceFile.size,
      status: 'pending'
    }, { transaction });

    console.log(`✅ [createEvidenceWithFile] Evidencia creada con ID: ${evidence.id}`);

    // Crear evento en el timeline
    const timelineEvent = await TimelineEvent.create({
      challengeId,
      type: 'evidence_submitted',
      description: `${user.fullName} (${user.username}) subió nueva evidencia: ${description || req.evidenceFile.originalname}`,
      timestamp: new Date()
    }, { transaction });

    console.log(`📋 [createEvidenceWithFile] Evento de timeline creado: ${timelineEvent.id}`);

    // Determinar quién es el oponente para enviar notificación
    let opponentId;
    if (challenge.creatorId === userId) {
      opponentId = challenge.challengerId;
    } else {
      opponentId = challenge.creatorId;
    }

    // Enviar notificación al oponente
    if (opponentId) {
      try {
        await notificationController.createNotification({
          userId: opponentId,
          type: 'evidence_submitted',
          title: 'Nueva evidencia subida',
          message: `${user.fullName} (${user.username}) ha subido una nueva evidencia en el desafío "${challenge.title}"`,
          relatedId: challengeId,
          relatedType: 'challenge'
        });
        console.log(`🔔 [createEvidenceWithFile] Notificación enviada al oponente: ${opponentId}`);
      } catch (notifError) {
        console.error('⚠️ [createEvidenceWithFile] Error al enviar notificación:', notifError);
      }
    }

    await transaction.commit();

    // Responder con la evidencia creada
    res.status(201).json({
      success: true,
      message: 'Evidencia subida exitosamente',
      data: {
        id: evidence.id,
        challengeId: evidence.challengeId,
        userId: evidence.userId,
        description: evidence.description,
        fileUrl: evidence.fileUrl,
        fileType: evidence.fileType,
        fileName: evidence.fileName,
        fileSize: evidence.fileSize,
        status: evidence.status,
        createdAt: evidence.createdAt,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          profilePicture: user.profilePicture
        }
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ [createEvidenceWithFile] Error al crear evidencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la evidencia',
      error: error.message
    });
  }
};

// Eliminar una evidencia
exports.deleteEvidence = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { evidenceId } = req.params;
    const userId = req.user.id;

    // Obtener la evidencia
    const evidence = await Evidence.findByPk(evidenceId);

    if (!evidence) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Evidencia no encontrada'
      });
    }

    // Verificar que el usuario es el propietario de la evidencia
    if (evidence.userId !== userId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar esta evidencia'
      });
    }

    // Eliminar la evidencia
    await evidence.destroy({ transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Evidencia eliminada con u00e9xito'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al eliminar evidencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la evidencia',
      error: error.message
    });
  }
};

// Crear evidencia con archivo subido
exports.createEvidenceWithFile = async (req, res) => {
  console.log('🚀 [createEvidenceWithFile] INICIO - Función createEvidenceWithFile llamada');
  console.log('🚀 [createEvidenceWithFile] Método:', req.method);
  console.log('🚀 [createEvidenceWithFile] URL:', req.originalUrl);
  console.log('🚀 [createEvidenceWithFile] Params:', req.params);
  console.log('🚀 [createEvidenceWithFile] Body:', req.body);
  console.log('🚀 [createEvidenceWithFile] Archivo:', req.evidenceFile);
  
  const transaction = await sequelize.transaction();
  
  try {
    // Aceptar tanto challengeId como id para compatibilidad con diferentes rutas
    const challengeId = req.params.challengeId || req.params.id;
    const { description } = req.body;
    const userId = req.user.id;
    
    console.log(`📤 [createEvidenceWithFile] Creando evidencia con archivo para desafío ${challengeId} por usuario ${userId}`);
    console.log(`📤 [createEvidenceWithFile] Descripción:`, description);
    console.log(`📤 [createEvidenceWithFile] Archivo:`, req.evidenceFile);

    // Verificar que el desafío existe
    const challenge = await Challenge.findByPk(challengeId);
    if (!challenge) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Desafío no encontrado'
      });
    }

    // Verificar que el usuario es participante del desafío
    const user = await User.findByPk(userId);
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Crear la evidencia con la información del archivo
    const evidence = await Evidence.create({
      challengeId,
      userId,
      description: description || 'Evidencia subida',
      fileUrl: req.evidenceFile.url,
      fileType: req.evidenceFile.mimetype,
      fileName: req.evidenceFile.originalname,
      fileSize: req.evidenceFile.size,
      status: 'pending'
    }, { transaction });

    console.log(`✅ [createEvidenceWithFile] Evidencia creada con ID: ${evidence.id}`);

    // Crear evento en el timeline
    const timelineEvent = await TimelineEvent.create({
      challengeId,
      type: 'evidence_submitted',
      description: `${user.fullName} (${user.username}) subió nueva evidencia: ${description || req.evidenceFile.originalname}`,
      timestamp: new Date()
    }, { transaction });

    console.log(`📋 [createEvidenceWithFile] Evento de timeline creado: ${timelineEvent.id}`);

    // Determinar quién es el oponente para enviar notificación
    let opponentId;
    if (challenge.creatorId === userId) {
      opponentId = challenge.challengerId;
    } else {
      opponentId = challenge.creatorId;
    }

    // Enviar notificación al oponente
    if (opponentId) {
      try {
        await notificationController.createNotification({
          userId: opponentId,
          type: 'evidence_submitted',
          title: 'Nueva evidencia subida',
          message: `${user.fullName} (${user.username}) ha subido una nueva evidencia en el desafío "${challenge.title}"`,
          relatedId: challengeId,
          relatedType: 'challenge'
        });
        console.log(`🔔 [createEvidenceWithFile] Notificación enviada al oponente: ${opponentId}`);
      } catch (notifError) {
        console.error('⚠️ [createEvidenceWithFile] Error al enviar notificación:', notifError);
      }
    }

    await transaction.commit();

    // Responder con la evidencia creada
    res.status(201).json({
      success: true,
      message: 'Evidencia subida exitosamente',
      data: {
        id: evidence.id,
        challengeId: evidence.challengeId,
        userId: evidence.userId,
        description: evidence.description,
        fileUrl: evidence.fileUrl,
        fileType: evidence.fileType,
        fileName: evidence.fileName,
        fileSize: evidence.fileSize,
        status: evidence.status,
        createdAt: evidence.createdAt,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          profilePicture: user.profilePicture
        }
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ [createEvidenceWithFile] Error al crear evidencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la evidencia',
      error: error.message
    });
  }
};
