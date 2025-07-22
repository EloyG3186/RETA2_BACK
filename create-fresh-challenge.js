const { Challenge, User, Participant, TimelineEvent } = require('./src/models');

async function createFreshChallenge() {
  try {
    console.log('🎯 Creando desafío completamente fresco...');

    // Buscar usuarios reales (EloyG y Gonza25)
    const eloyG = await User.findOne({ where: { username: 'EloyG' } });
    const gonza25 = await User.findOne({ where: { username: 'Gonza25' } });
    
    if (!eloyG || !gonza25) {
      console.error('❌ No se encontraron los usuarios EloyG y Gonza25');
      return;
    }

    console.log(`👤 Creador: ${eloyG.fullName} (${eloyG.username}) - ID: ${eloyG.id}`);
    console.log(`👤 Retador: ${gonza25.fullName} (${gonza25.username}) - ID: ${gonza25.id}`);

    // Crear el desafío
    const challenge = await Challenge.create({
      title: 'DESAFÍO FRESCO PARA JUEZ',
      description: 'Desafío completamente nuevo para probar asignación de juez',
      creatorId: eloyG.id,
      challengerId: gonza25.id,
      category: 'Aprendizaje',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
      entryFee: 30.00,
      prize: 60.00,
      maxParticipants: 2,
      status: 'accepted', // Estado correcto para asignar juez
      isPrivate: false
    });

    console.log(`✅ Desafío creado con ID: ${challenge.id}`);

    // Crear participantes
    await Participant.create({
      userId: eloyG.id,
      challengeId: challenge.id,
      role: 'creator',
      status: 'accepted',
      joinDate: new Date()
    });

    await Participant.create({
      userId: gonza25.id,
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
    
    // Verificar estado final
    const finalChallenge = await Challenge.findByPk(challenge.id);
    console.log(`📊 Estado final del desafío: ${finalChallenge.status}`);
    console.log(`⚖️ Juez asignado: ${finalChallenge.judgeId || 'Sin asignar'}`);
    
    console.log(`🎯 Desafío listo para asignar juez: http://localhost:3001/social/challenges/${challenge.id}`);
    console.log(`🆔 ID del desafío: ${challenge.id}`);
    
    return challenge;

  } catch (error) {
    console.error('❌ Error al crear desafío fresco:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createFreshChallenge()
    .then(() => {
      console.log('✅ Script completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error en script:', error);
      process.exit(1);
    });
}

module.exports = createFreshChallenge;
