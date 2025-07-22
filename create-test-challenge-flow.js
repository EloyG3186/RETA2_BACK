const { sequelize, User, Challenge, Participant, Category } = require('./src/models');

async function createTestChallengeFlow() {
  try {
    console.log('🚀 Creando nuevo desafío para probar flujo completo...');

    // Buscar usuarios existentes
    const eloy = await User.findOne({ where: { username: 'EloyG' } });
    const gonza = await User.findOne({ where: { username: 'Gonza25' } });
    const category = await Category.findOne({ where: { name: 'Aprendizaje' } });

    if (!eloy || !gonza || !category) {
      console.error('❌ No se encontraron los usuarios o categoría necesarios');
      return;
    }

    console.log('✅ Usuarios encontrados:');
    console.log('- Creador:', eloy.fullName);
    console.log('- Retador:', gonza.fullName);

    // Crear nuevo desafío
    const challenge = await Challenge.create({
      title: 'DESAFÍO FLUJO COMPLETO TEST',
      description: 'Desafío para probar el flujo completo de asignación de juez',
      category: category.name,
      categoryId: category.id,
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Mañana
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // En una semana
      entryFee: 25.00,
      prize: 50.00,
      maxParticipants: 2,
      status: 'pending', // Estado inicial
      isPrivate: false,
      creatorId: eloy.id,
      challengerId: gonza.id,
      judgeId: null,
      judgeVerdict: null,
      winnerDetermined: false,
      prizeFrozen: false
    });

    console.log('✅ Desafío creado:', challenge.id);

    // Crear participante creador
    await Participant.create({
      userId: eloy.id,
      challengeId: challenge.id,
      status: 'accepted', // El creador siempre está aceptado
      role: 'creator',
      result: 'none',
      paymentStatus: 'pending',
      isWinner: false
    });

    // Crear participante retador (pendiente)
    await Participant.create({
      userId: gonza.id,
      challengeId: challenge.id,
      status: 'pending', // El retador debe aceptar
      role: 'challenger',
      result: 'none',
      paymentStatus: 'pending',
      isWinner: false
    });

    console.log('✅ Participantes creados');
    console.log('🎯 Desafío listo para probar flujo:');
    console.log('   1. Estado: pending (retador debe aceptar)');
    console.log('   2. URL:', `http://localhost:3001/social/challenges/${challenge.id}`);
    console.log('   3. Flujo a probar:');
    console.log('      - Retador acepta desafío');
    console.log('      - Creador asigna juez');
    console.log('      - Juez acepta asignación');
    console.log('      - Desafío comienza');

    return challenge.id;

  } catch (error) {
    console.error('❌ Error creando desafío de prueba:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createTestChallengeFlow().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { createTestChallengeFlow };
