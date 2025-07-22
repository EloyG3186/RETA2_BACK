const cron = require('node-cron');
const challengeService = require('../services/challengeService');

/**
 * Configura tareas programadas para la gestión de desafíos
 */
const setupChallengeCronJobs = () => {
  console.log('Configurando tareas programadas para desafíos...');

  // Tarea para finalizar desafíos expirados - se ejecuta cada hora
  // El formato de cron es: segundo minuto hora día-del-mes mes día-de-la-semana
  // '0 0 * * * *' significa: ejecutar a cada hora exacta (minuto 0, segundo 0)
  cron.schedule('0 0 * * * *', async () => {
    console.log(`Ejecutando tarea programada: finalización de desafíos - ${new Date().toISOString()}`);
    
    try {
      const result = await challengeService.finalizeChallenges();
      console.log(`Tarea completada: ${result.count} desafíos finalizados`);
    } catch (error) {
      console.error('Error al ejecutar la tarea programada de finalización de desafíos:', error);
    }
  });

  console.log('Tareas programadas configuradas correctamente');
};

module.exports = { setupChallengeCronJobs };
