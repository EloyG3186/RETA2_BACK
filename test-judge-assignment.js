const { Challenge, User, Participant, sequelize, TimelineEvent } = require('./src/models');

async function testJudgeAssignment() {
  try {
    console.log('🧪 Probando asignación de juez...');

    // Buscar el desafío específico (el desafío más reciente del usuario)
    const challengeId = 'f8f327d1-5d2f-47b7-8143-bb517b3e3a0a';
    const judgeId = '0b4cb600-e339-4aa6-bdac-8ec24f73f112';

    console.log(`🔍 Buscando desafío: ${challengeId}`);
    const challenge = await Challenge.findByPk(challengeId);
    
    if (!challenge) {
      console.error('❌ Desafío no encontrado');
      
      // Listar desafíos disponibles
      const challenges = await Challenge.findAll({
        attributes: ['id', 'title', 'status', 'creatorId'],
        limit: 10
      });
      
      console.log('\n📋 Desafíos disponibles:');
      challenges.forEach(c => {
        console.log(`- ${c.id} | ${c.title} | ${c.status} | Creador: ${c.creatorId}`);
      });
      
      return;
    }

    console.log(`✅ Desafío encontrado: ${challenge.title}`);
    console.log(`📊 Estado actual: ${challenge.status}`);
    console.log(`👤 Creador: ${challenge.creatorId}`);
    console.log(`⚖️ Juez actual: ${challenge.judgeId || 'Sin asignar'}`);

    // Verificar que el juez existe
    console.log(`\n🔍 Buscando usuario juez: ${judgeId}`);
    const judge = await User.findByPk(judgeId);
    
    if (!judge) {
      console.error('❌ Usuario juez no encontrado');
      
      // Listar usuarios disponibles
      const users = await User.findAll({
        attributes: ['id', 'username', 'fullName'],
        limit: 10
      });
      
      console.log('\n👥 Usuarios disponibles:');
      users.forEach(u => {
        console.log(`- ${u.id} | ${u.username} | ${u.fullName}`);
      });
      
      return;
    }

    console.log(`✅ Usuario juez encontrado: ${judge.fullName} (${judge.username})`);

    // Verificar participantes
    console.log('\n🔍 Verificando participantes...');
    const participants = await Participant.findAll({
      where: { challengeId },
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'fullName'] }]
    });

    console.log(`👥 Participantes (${participants.length}):`);
    participants.forEach(p => {
      console.log(`- ${p.user.fullName} (${p.user.username}) | Rol: ${p.role} | Estado: ${p.status}`);
    });

    // Verificar si el juez es participante
    const isParticipant = participants.find(p => p.userId === judgeId);
    if (isParticipant) {
      console.error('❌ El usuario seleccionado es participante del desafío');
      return;
    }

    console.log('✅ El usuario no es participante, puede ser juez');

    // Verificar estado del desafío
    if (challenge.status !== 'accepted') {
      console.error(`❌ El desafío debe estar en estado 'accepted', pero está en '${challenge.status}'`);
      return;
    }

    console.log('✅ El desafío está en estado correcto para asignar juez');

    // Intentar crear TimelineEvent para probar
    console.log('\n🧪 Probando creación de TimelineEvent...');
    
    const transaction = await sequelize.transaction();
    try {
      const timelineEvent = await TimelineEvent.create({
        challengeId: challengeId,
        type: 'judge_assigned',
        timestamp: new Date(),
        description: 'Prueba de asignación de juez'
      }, { transaction });

      console.log('✅ TimelineEvent creado exitosamente:', timelineEvent.id);
      
      await transaction.rollback(); // No queremos guardar la prueba
      console.log('🔄 Transacción revertida (solo prueba)');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error al crear TimelineEvent:', error.message);
      console.error('📋 Detalles del error:', error);
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testJudgeAssignment()
    .then(() => {
      console.log('\n✅ Prueba completada');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error en la prueba:', error);
      process.exit(1);
    });
}

module.exports = testJudgeAssignment;
