const { Challenge, Participant, Evidence, User, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Servicio para finalizar automáticamente los desafíos que han alcanzado su fecha de fin
 */
exports.finalizeChallenges = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    // Buscar desafíos activos cuya fecha de fin ya pasó
    const now = new Date();
    const expiredChallenges = await Challenge.findAll({
      where: {
        status: 'in_progress',
        endDate: { [Op.lt]: now }
      }
    });

    console.log(`Encontrados ${expiredChallenges.length} desafíos para finalizar`);

    // Procesar cada desafío expirado
    for (const challenge of expiredChallenges) {
      try {
        // Cambiar el estado del desafío a 'completed'
        challenge.status = 'completed';
        await challenge.save({ transaction });

        // Determinar automáticamente el ganador basado en evidencias
        await determineWinnerByEvidences(challenge.id, transaction);

        console.log(`Desafío ${challenge.id} finalizado con éxito`);
      } catch (error) {
        console.error(`Error al finalizar el desafío ${challenge.id}:`, error);
        // Continuamos con el siguiente desafío aunque haya error en uno
      }
    }

    await transaction.commit();
    return { success: true, count: expiredChallenges.length };
  } catch (error) {
    await transaction.rollback();
    console.error('Error al finalizar desafíos:', error);
    throw error;
  }
};

/**
 * Determina el ganador de un desafío basado en las evidencias aprobadas
 */
async function determineWinnerByEvidences(challengeId, transaction) {
  // Obtener el desafío
  const challenge = await Challenge.findByPk(challengeId, {
    include: [{ model: Participant, include: [{ model: User, as: 'user' }] }]
  });

  if (!challenge) {
    throw new Error(`Desafío con ID ${challengeId} no encontrado`);
  }

  // Si ya se determinó un ganador, no hacer nada
  if (challenge.winnerDetermined) {
    return;
  }

  // Obtener todas las evidencias aprobadas del desafío
  const approvedEvidences = await Evidence.findAll({
    where: {
      challengeId,
      status: 'approved'
    },
    include: [{ model: User, as: 'submitter' }]
  });

  // Contar evidencias por usuario
  const evidencesByUser = {};
  approvedEvidences.forEach(evidence => {
    const userId = evidence.userId;
    evidencesByUser[userId] = (evidencesByUser[userId] || 0) + 1;
  });

  // Determinar el usuario con más evidencias aprobadas
  let winnerId = null;
  let maxEvidences = 0;
  let isTie = false;

  for (const [userId, count] of Object.entries(evidencesByUser)) {
    if (count > maxEvidences) {
      winnerId = userId;
      maxEvidences = count;
      isTie = false;
    } else if (count === maxEvidences) {
      isTie = true;
    }
  }

  // Si hay un ganador claro (no hay empate)
  if (winnerId && !isTie) {
    // Actualizar el desafío para marcar al ganador
    challenge.winnerDetermined = true;
    challenge.winnerId = winnerId; // Actualizar el campo winnerId en el modelo Challenge
    await challenge.save({ transaction });

    // Actualizar el participante ganador
    const winnerParticipant = challenge.participants.find(p => p.userId === winnerId);
    if (winnerParticipant) {
      winnerParticipant.isWinner = true;
      winnerParticipant.result = 'win';
      await winnerParticipant.save({ transaction });

      // Actualizar los demás participantes como perdedores
      for (const participant of challenge.participants) {
        if (participant.userId !== winnerId) {
          participant.result = 'lose';
          await participant.save({ transaction });
        }
      }

      // Aquí se podría agregar lógica para distribuir recompensas
      // Por ejemplo, actualizar la billetera del ganador
      try {
        const walletService = require('./walletService');
        await walletService.awardPrize(winnerId, challenge.prize, transaction);
        console.log(`Premio de ${challenge.prize} otorgado al ganador ${winnerId} del desafío ${challengeId}`);
      } catch (error) {
        console.error(`Error al otorgar premio al ganador ${winnerId} del desafío ${challengeId}:`, error);
        // No lanzamos el error para que el proceso de determinación del ganador no falle
      }
    }

    console.log(`Ganador determinado para el desafío ${challengeId}: Usuario ${winnerId}`);
  } else {
    console.log(`No se pudo determinar un ganador claro para el desafío ${challengeId}. Empate o sin evidencias suficientes.`);
    
    // Aún sin un ganador claro, marcamos el desafío como completado
    challenge.winnerDetermined = false;
    await challenge.save({ transaction });
  }
}

/**
 * Obtiene las estadísticas de un desafío
 */
exports.getChallengeStats = async (challengeId) => {
  try {
    // Obtener el desafío con sus participantes
    const challenge = await Challenge.findByPk(challengeId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'avatar']
        },
        {
          model: Participant,
          include: [
            {
              model: User,
              attributes: ['id', 'name', 'avatar']
            }
          ]
        }
      ]
    });

    if (!challenge) {
      throw new Error('Desafío no encontrado');
    }

    // Obtener todas las evidencias del desafío
    const evidences = await Evidence.findAll({
      where: { challengeId },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'avatar']
        }
      ]
    });

    // Estadísticas generales
    const totalEvidences = evidences.length;
    const approvedEvidences = evidences.filter(e => e.status === 'approved').length;
    const rejectedEvidences = evidences.filter(e => e.status === 'rejected').length;
    const pendingEvidences = evidences.filter(e => e.status === 'pending').length;

    // Obtener los participantes y sus estadísticas
    const participants = await Participant.findAll({
      where: { challengeId },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'avatar']
        }
      ]
    });

    // Calcular estadísticas por participante
    const participantStats = participants.map(participant => {
      const userEvidences = evidences.filter(e => e.userId === participant.userId);
      const userApprovedEvidences = userEvidences.filter(e => e.status === 'approved').length;
      const userRejectedEvidences = userEvidences.filter(e => e.status === 'rejected').length;
      const userPendingEvidences = userEvidences.filter(e => e.status === 'pending').length;

      return {
        userId: participant.userId,
        name: participant.User ? participant.User.name : 'Usuario desconocido',
        avatar: participant.User ? participant.User.avatar : null,
        totalEvidences: userEvidences.length,
        approvedEvidences: userApprovedEvidences,
        rejectedEvidences: userRejectedEvidences,
        pendingEvidences: userPendingEvidences,
        isWinner: participant.isWinner
      };
    });

    return {
      challengeId: challenge.id,
      title: challenge.title,
      status: challenge.status,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      winnerDetermined: participants.some(p => p.isWinner),
      participants: participantStats,
      totalEvidences,
      approvedEvidences,
      rejectedEvidences,
      pendingEvidences
    };
  } catch (error) {
    console.error('Error al obtener estadísticas del desafío:', error);
    throw error;
  }
};
