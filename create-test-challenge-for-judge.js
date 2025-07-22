const { Challenge, User, Participant, TimelineEvent } = require('./src/models');

async function createTestChallengeForJudge() {
  try {
    console.log('🎯 Creando desafío de prueba para asignación de juez...');

    // Buscar usuarios existentes
    const users = await User.findAll({ limit: 3 });
    if (users.length < 2) {
      console.error('❌ Se necesitan al menos 2 usuarios para crear el desafío');
      return;
    }

    const creator = users[0];  // EloyG
    const challenger = users[1];  // Gonza25
    
    console.log(`👤 Creador: ${creator.fullName} (${creator.id})`);
    console.log(`👤 Retador: ${challenger.fullName} (${challenger.id})`);

    // Crear el desafío
    const challenge = await Challenge.create({
      title: 'DESAFÍO PARA ASIGNAR JUEZ',
      description: 'Desafío de prueba para probar la asignación de juez',
      creatorId: creator.id,
      challengerId: challenger.id,
      category: 'Aprendizaje',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
      entryFee: 50.00,
      prize: 100.00,
      maxParticipants: 2,
      status: 'accepted', // Estado correcto para asignar juez
      isPrivate: false
    });

    console.log(`✅ Desafío creado con ID: ${challenge.id}`);

    // Crear participantes
    await Participant.create({
      userId: creator.id,
      challengeId: challenge.id,
      role: 'creator',
      status: 'accepted',
      joinDate: new Date()
    });

    await Participant.create({
      userId: challenger.id,
      challengeId: challenge.id,
      role: 'challenger',
      status: 'accepted',
      joinDate: new Date()
    });

    // Crear evento en timeline
    await TimelineEvent.create({
      challengeId: challenge.id,
      type: 'challenge_accepted',
      description: 'Todos los participantes han aceptado el desafío',
      timestamp: new Date()
    });

    console.log('✅ Participantes creados');
    console.log('✅ Timeline creado');
    console.log(`🎯 Desafío listo para asignar juez: http://localhost:3001/social/challenges/${challenge.id}`);
    
    return challenge;

  } catch (error) {
    console.error('❌ Error al crear desafío de prueba:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createTestChallengeForJudge()
    .then(() => {
      console.log('✅ Script completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error en script:', error);
      process.exit(1);
    });
}

module.exports = createTestChallengeForJudge;
