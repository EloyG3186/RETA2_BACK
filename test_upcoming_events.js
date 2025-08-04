const { sequelize } = require('./src/config/database');
const { User, Challenge, Participant } = require('./src/models');
const { Op } = require('sequelize');

async function testUpcomingEvents() {
  try {
    console.log('📅 Probando lógica de eventos próximos...\n');
    
    // Simular usuario EloyG
    const user = await User.findOne({ where: { username: 'EloyG' } });
    if (!user) {
      console.log('❌ Usuario EloyG no encontrado');
      return;
    }
    
    const userId = user.id;
    console.log(`👤 Usuario: ${user.username} (${userId})\n`);
    
    // 1. Buscar desafíos pendientes que necesitan aceptación
    console.log('🔍 Buscando desafíos pendientes...');
    const pendingChallenges = await Challenge.findAll({
      include: [{
        model: Participant,
        where: { userId },
        required: true
      }],
      where: {
        status: 'pending'
      },
      order: [['createdAt', 'DESC']],
      limit: 3
    });
    
    console.log(`📋 Desafíos pendientes encontrados: ${pendingChallenges.length}`);
    pendingChallenges.forEach((challenge, index) => {
      console.log(`   ${index + 1}. ${challenge.title} (${challenge.status}) - Creado: ${challenge.createdAt.toLocaleDateString('es-ES')}`);
    });
    
    // 2. Buscar desafíos en evaluación
    console.log('\n🔍 Buscando desafíos en evaluación...');
    const judgingChallenges = await Challenge.findAll({
      include: [{
        model: Participant,
        where: { userId },
        required: true
      }],
      where: {
        status: 'judging'
      },
      order: [['updatedAt', 'DESC']],
      limit: 2
    });
    
    console.log(`⚖️ Desafíos en evaluación encontrados: ${judgingChallenges.length}`);
    judgingChallenges.forEach((challenge, index) => {
      console.log(`   ${index + 1}. ${challenge.title} (${challenge.status}) - Actualizado: ${challenge.updatedAt.toLocaleDateString('es-ES')}`);
    });
    
    // 3. Crear eventos próximos
    console.log('\n📅 Generando eventos próximos...');
    let upcomingEvents = [];
    
    // Agregar desafíos pendientes como eventos
    pendingChallenges.forEach(challenge => {
      upcomingEvents.push({
        id: `pending_${challenge.id}`,
        title: `Pendiente: ${challenge.title}`,
        date: new Date(challenge.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'),
        type: 'pending'
      });
    });
    
    // Agregar desafíos en evaluación como eventos
    judgingChallenges.forEach(challenge => {
      upcomingEvents.push({
        id: `judging_${challenge.id}`,
        title: `En evaluación: ${challenge.title}`,
        date: new Date(challenge.updatedAt.getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'),
        type: 'judging'
      });
    });
    
    // Agregar eventos generales si hay pocos eventos específicos
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    if (upcomingEvents.length < 3) {
      upcomingEvents.push({
        id: 'weekly_summary',
        title: 'Resumen semanal de actividad',
        date: nextWeek.toLocaleDateString('es-ES'),
        type: 'summary'
      });
    }
    
    if (upcomingEvents.length < 4) {
      upcomingEvents.push({
        id: 'monthly_tournament',
        title: 'Torneo mensual de la comunidad',
        date: nextMonth.toLocaleDateString('es-ES'),
        type: 'tournament'
      });
    }
    
    // Ordenar por fecha y limitar a 5 eventos
    upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
    upcomingEvents = upcomingEvents.slice(0, 5);
    
    console.log(`\n✅ Total eventos próximos generados: ${upcomingEvents.length}`);
    upcomingEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. ${event.title} - ${event.date} (${event.type})`);
    });
    
    console.log('\n🎯 Resultado final para el frontend:');
    console.log(JSON.stringify({ upcomingEvents }, null, 2));
    
  } catch (error) {
    console.error('❌ Error en test de eventos próximos:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar test
testUpcomingEvents();
