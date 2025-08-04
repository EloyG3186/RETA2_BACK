const { sequelize } = require('./src/config/database');
const { User, Challenge, Participant } = require('./src/models');

async function debugChallenges() {
  try {
    console.log('🔍 DEBUG: Analizando desafíos y participaciones...\n');
    
    // 1. Buscar usuario EloyG
    const user = await User.findOne({ where: { username: 'EloyG' } });
    if (!user) {
      console.log('❌ Usuario EloyG no encontrado');
      return;
    }
    
    const userId = user.id;
    console.log(`👤 Usuario: ${user.username} (ID: ${userId})\n`);
    
    // 2. Buscar todas las participaciones del usuario
    console.log('📋 Buscando participaciones del usuario...');
    const participations = await Participant.findAll({
      where: { userId },
      include: [{
        model: Challenge,
        required: true
      }]
    });
    
    console.log(`📋 Participaciones encontradas: ${participations.length}`);
    
    if (participations.length > 0) {
      console.log('\n📊 Detalles de participaciones:');
      participations.forEach((participation, index) => {
        const challenge = participation.Challenge;
        console.log(`   ${index + 1}. Desafío: "${challenge.title}" (ID: ${challenge.id})`);
        console.log(`      Status: ${challenge.status}`);
        console.log(`      Participación: ${participation.status}`);
        console.log(`      Creado: ${challenge.createdAt.toLocaleDateString('es-ES')}`);
        console.log(`      Actualizado: ${challenge.updatedAt.toLocaleDateString('es-ES')}\n`);
      });
    }
    
    // 3. Buscar desafíos con status específicos
    console.log('🔍 Buscando desafíos con status "pending"...');
    const pendingChallenges = await Challenge.findAll({
      include: [{
        model: Participant,
        where: { userId },
        required: true
      }],
      where: {
        status: 'pending'
      }
    });
    
    console.log(`📋 Desafíos pendientes encontrados: ${pendingChallenges.length}`);
    
    console.log('\n🔍 Buscando desafíos con status "judging"...');
    const judgingChallenges = await Challenge.findAll({
      include: [{
        model: Participant,
        where: { userId },
        required: true
      }],
      where: {
        status: 'judging'
      }
    });
    
    console.log(`⚖️ Desafíos en evaluación encontrados: ${judgingChallenges.length}`);
    
    // 4. Buscar desafíos con status "judge_assigned"
    console.log('\n🔍 Buscando desafíos con status "judge_assigned"...');
    const judgeAssignedChallenges = await Challenge.findAll({
      include: [{
        model: Participant,
        where: { userId },
        required: true
      }],
      where: {
        status: 'judge_assigned'
      }
    });
    
    console.log(`👨‍⚖️ Desafíos con juez asignado encontrados: ${judgeAssignedChallenges.length}`);
    
    // 5. Contar por status
    console.log('\n📊 Resumen por status:');
    const statusCounts = {};
    participations.forEach(p => {
      const status = p.Challenge.status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} desafíos`);
    });
    
    console.log('\n✅ Análisis completado');
    
  } catch (error) {
    console.error('❌ Error en debug:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar debug
debugChallenges();
