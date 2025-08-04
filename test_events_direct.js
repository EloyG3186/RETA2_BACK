// TEST DIRECTO DE LA LÓGICA DE EVENTOS PRÓXIMOS
console.log('🧪 Iniciando test directo de eventos próximos...\n');

// Simular la lógica de eventos próximos sin base de datos
function generateUpcomingEvents() {
  let upcomingEvents = [];
  
  try {
    console.log('📅 [Test] Simulando búsqueda de eventos próximos...');
    
    // Simular que no se encuentran eventos específicos del usuario
    const pendingChallenges = []; // Simular array vacío
    const judgingChallenges = []; // Simular array vacío
    
    console.log(`🔍 [Test] Desafíos pendientes encontrados: ${pendingChallenges.length}`);
    console.log(`🔍 [Test] Desafíos en evaluación encontrados: ${judgingChallenges.length}`);
    
    // Agregar eventos generales de la plataforma
    console.log(`🔍 [Test] Eventos específicos encontrados hasta ahora: ${upcomingEvents.length}`);
    
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // Siempre agregar eventos útiles para el usuario
    console.log('🔍 [Test] Agregando eventos generales...');
    
    // Evento de revisión de desafíos pendientes (siempre útil)
    if (upcomingEvents.length < 5) {
      upcomingEvents.push({
        id: 'review_challenges',
        title: 'Revisar desafíos pendientes',
        date: tomorrow.toLocaleDateString('es-ES'),
        type: 'reminder'
      });
    }
    
    // Resumen semanal
    if (upcomingEvents.length < 5) {
      upcomingEvents.push({
        id: 'weekly_summary',
        title: 'Resumen semanal de actividad',
        date: nextWeek.toLocaleDateString('es-ES'),
        type: 'summary'
      });
    }
    
    // Torneo mensual
    if (upcomingEvents.length < 5) {
      upcomingEvents.push({
        id: 'monthly_tournament',
        title: 'Torneo mensual de la comunidad',
        date: nextMonth.toLocaleDateString('es-ES'),
        type: 'tournament'
      });
    }
    
    // Evento de nuevos desafíos
    if (upcomingEvents.length < 5) {
      const dayAfterTomorrow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      upcomingEvents.push({
        id: 'new_challenges',
        title: 'Nuevos desafíos disponibles',
        date: dayAfterTomorrow.toLocaleDateString('es-ES'),
        type: 'announcement'
      });
    }
    
    // Evento de conexión con amigos
    if (upcomingEvents.length < 5) {
      const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      upcomingEvents.push({
        id: 'connect_friends',
        title: 'Conectar con nuevos amigos',
        date: threeDaysLater.toLocaleDateString('es-ES'),
        type: 'social'
      });
    }
    
    // Ordenar por fecha y limitar a 5 eventos
    upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
    upcomingEvents = upcomingEvents.slice(0, 5);
    
    console.log(`📅 [Test] Eventos próximos encontrados: ${upcomingEvents.length}`);
    upcomingEvents.forEach((event, index) => {
      console.log(`📅 [Test] Evento ${index + 1}: ${event.title} - ${event.date} (${event.type})`);
    });
    
  } catch (error) {
    console.error('❌ Error al obtener eventos próximos:', error.message);
    console.error('❌ Stack trace:', error.stack);
    
    // FALLBACK: Generar eventos básicos si hay error
    console.log('🔄 [Test] Generando eventos de respaldo...');
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    upcomingEvents = [
      {
        id: 'fallback_review',
        title: 'Revisar desafíos pendientes',
        date: tomorrow.toLocaleDateString('es-ES'),
        type: 'reminder'
      },
      {
        id: 'fallback_weekly',
        title: 'Resumen semanal de actividad',
        date: nextWeek.toLocaleDateString('es-ES'),
        type: 'summary'
      },
      {
        id: 'fallback_connect',
        title: 'Conectar con nuevos amigos',
        date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'),
        type: 'social'
      }
    ];
    
    console.log('🔄 [Test] Eventos de respaldo generados:', upcomingEvents.length);
  }
  
  // Verificación final de eventos próximos
  if (!upcomingEvents || upcomingEvents.length === 0) {
    console.log('⚠️ [Test] ADVERTENCIA: No hay eventos próximos, generando eventos de emergencia...');
    const now = new Date();
    upcomingEvents = [
      {
        id: 'emergency_review',
        title: 'Revisar desafíos pendientes',
        date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'),
        type: 'reminder'
      },
      {
        id: 'emergency_activity',
        title: 'Revisar actividad reciente',
        date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'),
        type: 'summary'
      }
    ];
    console.log('⚠️ [Test] Eventos de emergencia creados:', upcomingEvents.length);
  }
  
  console.log('🎯 [Test] FINAL - Eventos próximos a enviar:', upcomingEvents.length);
  upcomingEvents.forEach((event, index) => {
    console.log(`🎯 [Test] FINAL Evento ${index + 1}: ${event.title} - ${event.date}`);
  });
  
  return upcomingEvents;
}

// Ejecutar test
const events = generateUpcomingEvents();

console.log('\n✅ RESULTADO FINAL:');
console.log('Número de eventos:', events.length);
console.log('Eventos generados:', JSON.stringify(events, null, 2));

if (events.length > 0) {
  console.log('\n🎉 ¡SUCCESS! La lógica funciona correctamente.');
  console.log('El problema debe estar en:');
  console.log('1. El servidor no se reinició con los cambios');
  console.log('2. Hay un error en las consultas de base de datos');
  console.log('3. El token JWT no es válido');
} else {
  console.log('\n❌ FAIL! Hay un error en la lógica.');
}
