const { Challenge, User, Participant, sequelize, TimelineEvent } = require('../models');
const gamificationService = require('../services/gamificationService');
const notificationController = require('./notificationController');
const { Op } = require('sequelize');

// Asignar un juez a un desafío
exports.assignJudge = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { judgeId } = req.body;
    const userId = req.user.id;

    console.log(`Usuario ${userId} intentando asignar juez ${judgeId} al desafío ${id}`);

    // Verificar que el desafío existe
    const challenge = await Challenge.findByPk(id, { 
      transaction,
      attributes: ['id', 'status', 'judgeId', 'creatorId', 'challengerId', 'title']
    });

    if (!challenge) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Desafío no encontrado'
      });
    }

    // Verificar que el usuario es el creador del desafío
    if (challenge.creatorId !== userId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Solo el creador puede asignar un juez'
      });
    }

    // Verificar que el desafío está en estado 'accepted'
    if (challenge.status !== 'accepted') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Solo se puede asignar un juez a desafíos aceptados'
      });
    }

    // Verificar que el juez existe
    const judge = await User.findByPk(judgeId, { transaction });

    if (!judge) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Usuario juez no encontrado'
      });
    }

    // Verificar que el juez no es participante del desafío
    const isParticipant = await Participant.findOne({
      where: {
        challengeId: id,
        userId: judgeId
      },
      transaction
    });

    if (isParticipant) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Un participante no puede ser juez del mismo desafío'
      });
    }

    // PUNTO CRÍTICO: Actualizar el desafío con el juez asignado y cambiar el estado a 'judge_assigned'
    console.log(`Asignando juez ${judgeId} al desafío ${id} y cambiando estado de '${challenge.status}' a 'judge_assigned'`);
    
    if (challenge.status !== 'accepted') {
      await transaction.rollback();
      console.error(`Error: Intento de asignar juez a un desafío que no está en estado 'accepted'. Estado actual: ${challenge.status}`);
      return res.status(400).json({
        success: false,
        message: `Solo se puede asignar un juez a desafíos en estado 'accepted'. Estado actual: ${challenge.status}`
      });
    }
    
    // Actualizar el desafío con el juez asignado y cambiar el estado a 'judge_assigned'
    await challenge.update({ 
      judgeId, 
      status: 'judge_assigned'
    }, { transaction });
    
    // Agregar un evento a la línea de tiempo para registrar la asignación del juez
    await TimelineEvent.create({
      challengeId: id,
      type: 'judge_assigned',
      timestamp: new Date(),
      description: `Se ha asignado un juez al desafío. Esperando que el juez acepte la asignación.`
    }, { transaction });
    
    console.log(`Juez asignado con éxito. Desafío ${id} ahora en estado 'judge_assigned'`);

    console.log('🔄 Haciendo commit de la transacción...');
    await transaction.commit();
    console.log('✅ Transacción confirmada exitosamente');

    console.log('🔍 Obteniendo desafío actualizado para respuesta...');
    try {
      // Obtener el desafío actualizado SIN includes complejos primero
      const updatedChallenge = await Challenge.findByPk(id);
      
      if (!updatedChallenge) {
        console.warn('⚠️ Desafío no encontrado después del commit');
        return res.status(200).json({
          success: true,
          message: 'Juez asignado con éxito',
          data: { id, judgeId, status: 'judge_assigned' }
        });
      }
      
      console.log('✅ Desafío actualizado obtenido exitosamente');
      console.log('📊 Estado actual:', updatedChallenge.status);
      console.log('👨‍⚖️ Juez asignado:', updatedChallenge.judgeId);
      console.log('📤 Enviando respuesta exitosa...');
      
      return res.status(200).json({
        success: true,
        message: 'Juez asignado con éxito',
        data: {
          id: updatedChallenge.id,
          judgeId: updatedChallenge.judgeId,
          status: updatedChallenge.status,
          updatedAt: updatedChallenge.updatedAt
        }
      });
    } catch (fetchError) {
      console.error('❌ Error al obtener desafío actualizado:', fetchError);
      console.error('❌ Stack trace:', fetchError.stack);
      // Aún así, la asignación fue exitosa, así que devolvemos éxito
      return res.status(200).json({
        success: true,
        message: 'Juez asignado con éxito (sin datos actualizados)',
        data: { id, judgeId, status: 'judge_assigned' }
      });
    }
  } catch (error) {
    // Solo hacemos rollback si la transacción no ha sido confirmada
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('Error al asignar juez:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al asignar juez',
      error: error.message
    });
  }
};

// Aceptar asignación como juez
exports.acceptJudgeAssignment = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`Juez ${userId} intentando aceptar asignación para el desafío ${id}`);

    // Verificar que el desafío existe
    const challenge = await Challenge.findByPk(id, { 
      transaction,
      attributes: ['id', 'status', 'judgeId', 'creatorId', 'challengerId', 'title']
    });

    if (!challenge) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Desafío no encontrado'
      });
    }

    // Verificar que el usuario es el juez asignado
    if (challenge.judgeId !== userId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Solo el juez asignado puede aceptar la asignación'
      });
    }

    // Verificar que el desafío está en estado 'judge_assigned'
    if (challenge.status !== 'judge_assigned') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Solo se puede aceptar la asignación de juez para desafíos en estado 'judge_assigned'. Estado actual: ${challenge.status}`
      });
    }

    // Actualizar el estado del desafío a 'in_progress'
    await challenge.update({ 
      status: 'in_progress' 
    }, { transaction });

    // Agregar un evento a la línea de tiempo
    await TimelineEvent.create({
      challengeId: id,
      type: 'challenge_started',
      timestamp: new Date(),
      description: `El juez ha aceptado la asignación. El desafío ahora está en progreso.`
    }, { transaction });

    // Otorgar puntos al usuario por actuar como juez
    await gamificationService.addPoints(
      userId, 
      25, 
      'Ser juez en un desafío',
      {
        actionType: 'judge_challenge',
        relatedEntityType: 'Challenge',
        relatedEntityId: id,
        metadata: {
          challengeTitle: challenge.title,
          judgeRole: 'main_judge'
        }
      }
    );
    
    // Contar cuántos desafíos ha juzgado el usuario
    const judgedChallengesCount = await Challenge.count({
      where: { 
        judgeId: userId,
        status: { [Op.in]: ['in_progress', 'completed'] }
      }
    });
    
    // Si ha sido juez en 3 desafíos, otorgar insignia de Juez Imparcial
    if (judgedChallengesCount === 3) {
      await gamificationService.awardBadge(userId, 'Juez Imparcial');
    }
    // Si ha sido juez en 10 desafíos, otorgar insignia de Árbitro Experto
    else if (judgedChallengesCount === 10) {
      await gamificationService.awardBadge(userId, 'Árbitro Experto');
    }

    await transaction.commit();

    // Devolver respuesta exitosa directamente sin consulta adicional
    console.log('✅ Asignación de juez aceptada exitosamente');
    console.log('📊 Desafío actualizado a estado: in_progress');
    
    return res.status(200).json({
      success: true,
      message: 'Asignación de juez aceptada exitosamente',
      data: {
        id: id,
        status: 'in_progress',
        judgeId: userId,
        message: 'El desafío ha comenzado y está en progreso'
      }
    });

  } catch (error) {
    // Solo hacemos rollback si la transacción no ha sido confirmada
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('Error al aceptar asignación de juez:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al aceptar asignación de juez',
      error: error.message
    });
  }
};

// Rechazar asignación como juez
exports.rejectJudgeAssignment = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar que el desafío existe
    const challenge = await Challenge.findByPk(id, { 
      transaction,
      attributes: ['id', 'status', 'judgeId', 'creatorId', 'challengerId', 'title']
    });

    if (!challenge) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Desafío no encontrado'
      });
    }

    // Verificar que el usuario es el juez asignado
    if (challenge.judgeId !== userId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Solo el juez asignado puede rechazar la asignación'
      });
    }

    // Verificar que el desafío está en estado 'judge_assigned'
    if (challenge.status !== 'judge_assigned') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Solo se puede rechazar la asignación de juez para desafíos en estado de asignación de juez'
      });
    }

    // Actualizar el desafío para quitar el juez y volver al estado 'accepted'
    await challenge.update({ 
      judgeId: null,
      status: 'accepted'
    }, { transaction });

    // Agregar un evento a la línea de tiempo
    await TimelineEvent.create({
      challengeId: id,
      type: 'judge_rejected',
      timestamp: new Date(),
      description: `El juez ha rechazado la asignación. Se requiere asignar un nuevo juez.`
    }, { transaction });

    await transaction.commit();

    // Obtener el desafío actualizado para devolverlo en la respuesta
    const updatedChallenge = await Challenge.findByPk(id, {
      include: [
        { model: User, as: 'creator' },
        { model: Participant, include: [{ model: User, as: 'user' }] }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Asignación de juez rechazada con éxito',
      data: updatedChallenge
    });
  } catch (error) {
    // Solo hacemos rollback si la transacción no ha sido confirmada
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('Error al rechazar asignación de juez:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al rechazar asignación de juez',
      error: error.message
    });
  }
};

// Emitir veredicto como juez
exports.judgeVerdict = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { winnerId, comments } = req.body;
    const userId = req.user.id;

    // Verificar que el desafío existe
    const challenge = await Challenge.findByPk(id, { 
      transaction,
      attributes: ['id', 'status', 'judgeId', 'creatorId', 'challengerId', 'title']
    });

    if (!challenge) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Desafío no encontrado'
      });
    }

    // Verificar que el usuario es el juez asignado
    if (challenge.judgeId !== userId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Solo el juez asignado puede emitir un veredicto'
      });
    }

    // Verificar que el desafío está en estado 'in_progress'
    if (challenge.status !== 'in_progress') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Solo se puede emitir un veredicto para desafíos en progreso'
      });
    }

    // Verificar que el ganador es un participante válido
    const winnerParticipant = await Participant.findOne({
      where: { 
        userId: winnerId, 
        challengeId: id,
        status: 'accepted'
      },
      transaction
    });

    if (!winnerParticipant) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'El ganador seleccionado no es un participante válido'
      });
    }

    // Actualizar el estado del ganador
    await winnerParticipant.update({
      isWinner: true,
      result: 'win'
    }, { transaction });

    // Actualizar el estado de los demás participantes
    await Participant.update(
      { result: 'lose' },
      { 
        where: { 
          challengeId: id, 
          userId: { [Op.ne]: winnerId },
          status: 'accepted'
        },
        transaction 
      }
    );

    // Actualizar el estado de la competencia
    await challenge.update({ 
      status: 'completed',
      winnerDetermined: true,
      judgeComments: comments || 'El juez ha determinado un ganador.'
    }, { transaction });

    // Agregar un evento a la línea de tiempo
    await TimelineEvent.create({
      challengeId: id,
      type: 'judge_verdict',
      timestamp: new Date(),
      description: `El juez ha emitido su veredicto. El desafío ha sido completado.`
    }, { transaction });

    // Otorgar puntos adicionales al juez por completar su tarea
    await gamificationService.addPoints(
      userId, 
      15, 
      'Completar tarea como juez',
      {
        actionType: 'complete_judge_task',
        relatedEntityType: 'Challenge',
        relatedEntityId: id,
        metadata: {
          challengeTitle: challenge.title,
          judgeAction: 'determine_winner',
          winnerId: winnerId
        }
      }
    );

    await transaction.commit();

    // Obtener el desafío actualizado para devolverlo en la respuesta
    const updatedChallenge = await Challenge.findByPk(id, {
      include: [
        { model: User, as: 'creator' },
        { model: User, as: 'challenger' },
        { model: Participant, include: [{ model: User, as: 'user' }] }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Veredicto emitido con éxito',
      data: updatedChallenge
    });
  } catch (error) {
    // Solo hacemos rollback si la transacción no ha sido confirmada
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('Error al emitir veredicto:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al emitir veredicto',
      error: error.message
    });
  }
};

// Solicitar revisión de juez
exports.requestJudging = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar que el desafío existe
    const challenge = await Challenge.findByPk(id, { 
      transaction,
      attributes: ['id', 'status', 'judgeId', 'creatorId', 'challengerId', 'title']
    });

    if (!challenge) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Desafío no encontrado'
      });
    }

    // Verificar que el usuario es participante del desafío
    const isParticipant = await Participant.findOne({
      where: {
        challengeId: id,
        userId,
        status: 'accepted'
      },
      transaction
    });

    if (!isParticipant) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Solo los participantes pueden solicitar revisión del juez'
      });
    }

    // Verificar que el desafío está en estado 'in_progress'
    if (challenge.status !== 'in_progress') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Solo se puede solicitar revisión para desafíos en progreso'
      });
    }

    // Agregar un evento a la línea de tiempo
    await TimelineEvent.create({
      challengeId: id,
      type: 'judging_requested',
      timestamp: new Date(),
      description: `Un participante ha solicitado la revisión del juez.`
    }, { transaction });

    await transaction.commit();

    // Notificar al juez
    try {
      await notificationController.createNotification(
        challenge.judgeId,
        'judge_review_requested',
        `Un participante ha solicitado tu revisión en el desafío "${challenge.title}".`,
        id
      );
    } catch (notifError) {
      console.error('Error al crear notificación para el juez:', notifError);
      // No interrumpimos el flujo principal si falla la notificación
    }

    return res.status(200).json({
      success: true,
      message: 'Solicitud de revisión enviada con éxito',
      data: {
        challengeId: id,
        requestedBy: userId
      }
    });
  } catch (error) {
    // Solo hacemos rollback si la transacción no ha sido confirmada
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('Error al solicitar revisión:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al solicitar revisión',
      error: error.message
    });
  }
};

// Congelar el premio de un desafío
exports.freezePrize = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar que el desafío existe
    const challenge = await Challenge.findByPk(id, { 
      transaction,
      attributes: ['id', 'status', 'judgeId', 'creatorId', 'challengerId', 'title']
    });

    if (!challenge) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Desafío no encontrado'
      });
    }

    // Verificar que el usuario es el juez asignado
    if (challenge.judgeId !== userId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Solo el juez asignado puede congelar el premio'
      });
    }

    // Verificar que el desafío está en estado 'in_progress'
    if (challenge.status !== 'in_progress') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Solo se puede congelar el premio para desafíos en progreso'
      });
    }

    // Actualizar el estado del desafío
    await challenge.update({ 
      prizeFrozen: true
    }, { transaction });

    // Agregar un evento a la línea de tiempo
    await TimelineEvent.create({
      challengeId: id,
      type: 'prize_frozen',
      timestamp: new Date(),
      description: `El juez ha congelado el premio del desafío.`
    }, { transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: 'Premio congelado con éxito',
      data: {
        challengeId: id,
        prizeFrozen: true
      }
    });
  } catch (error) {
    // Solo hacemos rollback si la transacción no ha sido confirmada
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('Error al congelar premio:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al congelar premio',
      error: error.message
    });
  }
};
