const { Evidence, Challenge, User, sequelize, TimelineEvent } = require('../models');
const notificationController = require('./notificationController');

// Crear una nueva evidencia (sin archivo)
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

    // Verificar que el desafío está en progreso
    if (challenge.status !== 'in_progress') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden añadir evidencias a desafíos en progreso'
      });
    }

    // Crear la evidencia (sin archivo)
    const evidence = await Evidence.create({
      challengeId,
      userId,
      description: description || 'Evidencia de texto',
      fileUrl: null, // No hay archivo
      fileType: 'text/plain', // Tipo por defecto para evidencias de texto
      timestamp: new Date(),
      status: 'pending'
    }, { transaction });

    console.log(`✅ [createEvidence] Evidencia creada con ID: ${evidence.id}`);

    // Crear evento de timeline para la evidencia enviada
    const timelineEvent = await TimelineEvent.create({
      challengeId,
      type: 'evidence_submitted',
      description: `${user.fullName} (${user.username}) subió nueva evidencia: ${description || 'Sin descripción'}`,
      timestamp: new Date()
    }, { transaction });

    console.log(`📋 [createEvidence] Evento de timeline creado: ${timelineEvent.id}`);

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
        console.log(`🔔 [createEvidence] Notificación enviada al oponente: ${opponentId}`);
      } catch (notifError) {
        console.error('⚠️ [createEvidence] Error al enviar notificación:', notifError);
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
    console.error('❌ [createEvidence] Error al crear evidencia:', error);
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

    // Verificar que el desafío permite subir evidencias
    const allowedStatuses = ['in_progress', 'judge_assigned'];
    if (!allowedStatuses.includes(challenge.status)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Solo se pueden añadir evidencias a desafíos en progreso o con juez asignado. Estado actual: ${challenge.status}`
      });
    }

    // Crear la evidencia con la información del archivo
    const evidence = await Evidence.create({
      challengeId,
      userId,
      description: description || 'Evidencia subida',
      fileUrl: req.evidenceFile.url,
      fileType: req.evidenceFile.mimetype,
      timestamp: new Date(),
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
        status: evidence.status,
        timestamp: evidence.timestamp,
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
    
    console.log(`🔍 [getChallengeEvidences] Obteniendo evidencias para desafío: ${challengeId}`);

    // Primero intentar sin include para debuggear
    const evidences = await Evidence.findAll({
      where: { challengeId },
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`📊 [getChallengeEvidences] Evidencias encontradas (sin include): ${evidences.length}`);
    
    // Si hay evidencias, intentar obtener los usuarios por separado
    const evidencesWithUsers = [];
    for (const evidence of evidences) {
      const user = await User.findByPk(evidence.userId, {
        attributes: ['id', 'username', 'fullName', 'profilePicture']
      });
      evidencesWithUsers.push({
        ...evidence.toJSON(),
        submitter: user
      });
    }

    console.log(`✅ [getChallengeEvidences] Encontradas ${evidencesWithUsers.length} evidencias con usuarios`);

    res.json({
      success: true,
      data: evidencesWithUsers
    });
  } catch (error) {
    console.error('❌ [getChallengeEvidences] Error al obtener evidencias:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las evidencias',
      error: error.message
    });
  }
};

// Obtener una evidencia específica
exports.getEvidenceById = async (req, res) => {
  try {
    const { evidenceId } = req.params;

    const evidence = await Evidence.findByPk(evidenceId, {
      include: [
        {
          model: User,
          as: 'submitter',
          attributes: ['id', 'username', 'fullName', 'profilePicture']
        },
        {
          model: Challenge,
          attributes: ['id', 'title', 'status']
        }
      ]
    });

    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidencia no encontrada'
      });
    }

    res.json({
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

// Actualizar el estado de una evidencia (aprobar/rechazar)
exports.updateEvidenceStatus = async (req, res) => {
  console.log('✅ [updateEvidenceStatus] INICIO - Función updateEvidenceStatus llamada');
  console.log('✅ [updateEvidenceStatus] Método:', req.method);
  console.log('✅ [updateEvidenceStatus] URL:', req.originalUrl);
  console.log('✅ [updateEvidenceStatus] Params:', req.params);
  console.log('✅ [updateEvidenceStatus] Body:', req.body);
  console.log('✅ [updateEvidenceStatus] Usuario:', req.user?.id);
  
  const transaction = await sequelize.transaction();
  
  try {
    const { evidenceId } = req.params;
    const { status, judgeComments } = req.body;
    const userId = req.user.id;
    
    console.log(`✅ [updateEvidenceStatus] Actualizando evidencia ${evidenceId} a estado ${status} por usuario ${userId}`);

    // Validar el estado
    if (!['approved', 'rejected'].includes(status)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser "approved" o "rejected"'
      });
    }

    // Obtener la evidencia
    console.log('✅ [updateEvidenceStatus] Buscando evidencia con ID:', evidenceId);
    const evidence = await Evidence.findByPk(evidenceId, {
      include: [
        {
          model: Challenge,
          as: 'challenge',
          include: [
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'username', 'fullName']
            },
            {
              model: User,
              as: 'challengerUser',
              attributes: ['id', 'username', 'fullName']
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'fullName']
        }
      ]
    });
    
    console.log('✅ [updateEvidenceStatus] Evidencia encontrada:', evidence ? 'SÍ' : 'NO');
    if (evidence) {
      console.log('✅ [updateEvidenceStatus] Challenge ID:', evidence.challengeId);
      console.log('✅ [updateEvidenceStatus] Judge ID del desafío:', evidence.challenge?.judgeId);
      console.log('✅ [updateEvidenceStatus] Usuario actual:', userId);
      console.log('✅ [updateEvidenceStatus] ¿Es juez?:', evidence.challenge?.judgeId === userId);
    }

    if (!evidence) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Evidencia no encontrada'
      });
    }

    // Verificar que el usuario es el juez del desafío
    if (evidence.challenge.judgeId !== userId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Solo el juez puede actualizar el estado de las evidencias'
      });
    }

    // Actualizar la evidencia
    await evidence.update({
      status,
      judgeComments
    }, { transaction });

    // Crear evento de timeline
    const user = await User.findByPk(userId);
    const statusText = status === 'approved' ? 'aprobó' : 'rechazó';
    
    const timelineEvent = await TimelineEvent.create({
      challengeId: evidence.challengeId,
      type: `evidence_${status}`,
      description: `${user.fullName} (${user.username}) ${statusText} la evidencia de ${evidence.user.fullName}`,
      timestamp: new Date()
    }, { transaction });

    // Enviar notificación al usuario que subió la evidencia
    try {
      await notificationController.createNotification({
        userId: evidence.userId,
        type: `evidence_${status}`,
        title: `Evidencia ${status === 'approved' ? 'aprobada' : 'rechazada'}`,
        message: `Tu evidencia ha sido ${status === 'approved' ? 'aprobada' : 'rechazada'} por el juez ${user.fullName}`,
        relatedId: evidence.challengeId,
        relatedType: 'challenge'
      });
      console.log(`🔔 [updateEvidenceStatus] Notificación enviada al usuario: ${evidence.userId}`);
    } catch (notifError) {
      console.error('⚠️ [updateEvidenceStatus] Error al enviar notificación:', notifError);
    }

    await transaction.commit();

    res.json({
      success: true,
      message: `Evidencia ${status === 'approved' ? 'aprobada' : 'rechazada'} con éxito`,
      data: evidence
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al actualizar estado de evidencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado de la evidencia',
      error: error.message
    });
  }
};

// Eliminar una evidencia
exports.deleteEvidence = async (req, res) => {
  console.log('🗑️ [deleteEvidence] INICIO - Función deleteEvidence llamada');
  console.log('🗑️ [deleteEvidence] Método:', req.method);
  console.log('🗑️ [deleteEvidence] URL:', req.originalUrl);
  console.log('🗑️ [deleteEvidence] Params:', req.params);
  console.log('🗑️ [deleteEvidence] Usuario:', req.user?.id);
  
  const transaction = await sequelize.transaction();
  
  try {
    const { evidenceId } = req.params;
    const userId = req.user.id;
    
    console.log(`🗑️ [deleteEvidence] Intentando eliminar evidencia ${evidenceId} por usuario ${userId}`);

    const evidence = await Evidence.findByPk(evidenceId);
    console.log('🗑️ [deleteEvidence] Evidencia encontrada:', evidence ? 'SÍ' : 'NO');
    
    if (evidence) {
      console.log('🗑️ [deleteEvidence] Propietario de la evidencia:', evidence.userId);
      console.log('🗑️ [deleteEvidence] Usuario solicitante:', userId);
      console.log('🗑️ [deleteEvidence] ¿Es propietario?:', evidence.userId === userId);
    }
    
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

    console.log('🗑️ [deleteEvidence] Eliminando evidencia de la base de datos...');
    await evidence.destroy({ transaction });
    console.log('🗑️ [deleteEvidence] Evidencia eliminada, confirmando transacción...');
    await transaction.commit();
    console.log('🗑️ [deleteEvidence] Transacción confirmada exitosamente');

    res.json({
      success: true,
      message: 'Evidencia eliminada con éxito'
    });
    
    console.log('🗑️ [deleteEvidence] Respuesta enviada al cliente');
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
