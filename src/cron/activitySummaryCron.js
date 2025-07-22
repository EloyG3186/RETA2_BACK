const cron = require('node-cron');
const { User } = require('../models');
const { getNotificationPreferences } = require('../services/userService');
const { getUserActivitySummary } = require('../services/statsService');
const { sendActivitySummary } = require('../services/emailService');

/**
 * Configura tareas programadas para el envu00edo de resu00famenes de actividad
 */
const setupActivitySummaryCronJobs = () => {
  console.log('Configurando tareas programadas para envu00edo de resu00famenes de actividad...');

  // Resumen semanal - se ejecuta cada lunes a las 8:00 AM
  // '0 8 * * 1' = minuto 0, hora 8, cualquier du00eda del mes, cualquier mes, du00eda de la semana 1 (lunes)
  cron.schedule('0 8 * * 1', () => sendSummaries('weekly'));
  
  // Resumen mensual - se ejecuta el primer du00eda de cada mes a las 8:00 AM
  // '0 8 1 * *' = minuto 0, hora 8, du00eda 1, cualquier mes, cualquier du00eda de la semana
  cron.schedule('0 8 1 * *', () => sendSummaries('monthly'));
  
  console.log('Tareas programadas de resu00famenes configuradas correctamente');
};

/**
 * Envu00eda resu00famenes de actividad a los usuarios que tengan habilitada esta opciu00f3n
 * @param {string} period - Peru00edodo del resumen ('weekly' o 'monthly')
 */
const sendSummaries = async (period) => {
  console.log(`Ejecutando tarea programada: envu00edo de resu00famenes ${period} - ${new Date().toISOString()}`);
  
  try {
    // Obtener todos los usuarios activos
    const users = await User.findAll({ 
      where: { isActive: true }
    });
    
    console.log(`Procesando ${users.length} usuarios para envu00edo de resu00famenes ${period}...`);
    
    let sentCount = 0;
    let errorCount = 0;
    
    // Procesar cada usuario
    for (const user of users) {
      try {
        // Verificar si el usuario tiene habilitada la opciu00f3n de resu00famenes
        const preferences = await getNotificationPreferences(user.id);
        
        // Comprobar si tiene activados los resu00famenes para este peru00edodo
        const isEnabled = period === 'weekly' 
          ? preferences.weeklyReport 
          : preferences.monthlyReport;
        
        // Si no tiene habilitada la opciu00f3n o no tiene email configurado, omitir
        if (!isEnabled || !user.email) {
          continue;
        }
        
        // Obtener datos del resumen
        const summaryData = await getUserActivitySummary(user.id, period);
        
        // Si no hay suficientes datos para el resumen, omitir
        if (!summaryData || !summaryData.stats) {
          continue;
        }
        
        // Enviar el resumen por email
        await sendActivitySummary(user, summaryData, period);
        sentCount++;
        
        // Esperar un pequeu00f1o tiempo entre envu00edos para no sobrecargar el servidor SMTP
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (userError) {
        console.error(`Error al procesar resumen para usuario ${user.id}:`, userError);
        errorCount++;
        // Continuar con el siguiente usuario a pesar del error
      }
    }
    
    console.log(`Tarea completada: ${sentCount} resu00famenes ${period} enviados, ${errorCount} errores`);
    
  } catch (error) {
    console.error(`Error al ejecutar la tarea programada de envu00edo de resu00famenes ${period}:`, error);
  }
};

module.exports = { setupActivitySummaryCronJobs };
