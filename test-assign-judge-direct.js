const { Challenge, User, Participant, sequelize, TimelineEvent } = require('./src/models');

async function testAssignJudgeDirect() {
  const transaction = await sequelize.transaction();
  try {
    console.log('🧪 Probando asignación de juez directamente...');

    const challengeId = '8048f5ff-4f58-4acb-a9d8-063a2f0ebb85';
    const judgeId = '0b4cb600-e339-4aa6-bdac-8ec24f73f112';
    const userId = '91f709ca-3830-488c-9168-fbe5bd68ba90'; // EloyG (creador)

    console.log(`Usuario ${userId} intentando asignar juez ${judgeId} al desafío ${challengeId}`);

    // Verificar que el desafío existe
    const challenge = await Challenge.findByPk(challengeId, { transaction });

    if (!challenge) {
      await transaction.rollback();
      console.error('❌ Desafío no encontrado');
      return;
    }

    console.log(`✅ Desafío encontrado: ${challenge.title}`);
    console.log(`📊 Estado: ${challenge.status}`);

    // Verificar que el usuario es el creador del desafío
    if (challenge.creatorId !== userId) {
      await transaction.rollback();
      console.error(`❌ Solo el creador puede asignar un juez. Creador: ${challenge.creatorId}, Usuario: ${userId}`);
      return;
    }

    console.log('✅ Usuario es el creador del desafío');

    // Verificar que el desafío está en estado 'accepted'
    if (challenge.status !== 'accepted') {
      await transaction.rollback();
      console.error(`❌ Solo se puede asignar un juez a desafíos aceptados. Estado actual: ${challenge.status}`);
      return;
    }

    console.log('✅ Desafío está en estado correcto');

    // Verificar que el juez existe
    const judge = await User.findByPk(judgeId, { transaction });

    if (!judge) {
      await transaction.rollback();
      console.error('❌ Usuario juez no encontrado');
      return;
    }

    console.log(`✅ Usuario juez encontrado: ${judge.fullName}`);

    // Verificar que el juez no es participante del desafío
    const isParticipant = await Participant.findOne({
      where: {
        challengeId: challengeId,
        userId: judgeId
      },
      transaction
    });

    if (isParticipant) {
      await transaction.rollback();
      console.error('❌ Un participante no puede ser juez del mismo desafío');
      return;
    }

    console.log('✅ El juez no es participante');

    // PUNTO CRÍTICO: Actualizar el desafío con el juez asignado y cambiar el estado a 'judge_assigned'
    console.log(`🔄 Asignando juez ${judgeId} al desafío ${challengeId} y cambiando estado de '${challenge.status}' a 'judge_assigned'`);
    
    // Actualizar el desafío con el juez asignado y cambiar el estado a 'judge_assigned'
    await challenge.update({ 
      judgeId, 
      status: 'judge_assigned'
    }, { transaction });
    
    console.log('✅ Desafío actualizado');

    // Agregar un evento a la línea de tiempo para registrar la asignación del juez
    console.log('🔍 DEBUG: Intentando crear TimelineEvent...');
    console.log('🔍 DEBUG: challengeId:', challengeId);
    console.log('🔍 DEBUG: type: judge_assigned');
    console.log('🔍 DEBUG: timestamp:', new Date());
    
    try {
      const timelineEvent = await TimelineEvent.create({
        challengeId: challengeId,
        type: 'judge_assigned',
        timestamp: new Date(),
        description: `Se ha asignado un juez al desafío. Esperando que el juez acepte la asignación.`
      }, { transaction });
      console.log('✅ DEBUG: TimelineEvent creado exitosamente:', timelineEvent.id);
    } catch (timelineError) {
      console.error('❌ DEBUG: Error al crear TimelineEvent:', timelineError);
      throw timelineError;
    }
    
    console.log(`✅ Juez asignado con éxito. Desafío ${challengeId} ahora en estado 'judge_assigned'`);

    await transaction.commit();
    console.log('✅ Transacción confirmada');

    // Obtener el desafío actualizado para verificar
    const updatedChallenge = await Challenge.findByPk(challengeId);
    console.log(`📊 Estado final: ${updatedChallenge.status}`);
    console.log(`⚖️ Juez asignado: ${updatedChallenge.judgeId}`);

    return {
      success: true,
      message: 'Juez asignado con éxito',
      data: updatedChallenge
    };
  } catch (error) {
    // Solo hacemos rollback si la transacción no ha sido confirmada
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('❌ Error al asignar juez:', error);
    return {
      success: false,
      message: 'Error al asignar juez',
      error: error.message
    };
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testAssignJudgeDirect()
    .then((result) => {
      console.log('\n📋 Resultado:', result);
      console.log('✅ Prueba completada');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error en la prueba:', error);
      process.exit(1);
    });
}

module.exports = testAssignJudgeDirect;
