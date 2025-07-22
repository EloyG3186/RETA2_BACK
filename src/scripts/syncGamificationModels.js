const { sequelize, Badge, UserBadge, UserPoints } = require('../models');

/**
 * Script para sincronizar los modelos de gamificación con la base de datos
 */
async function syncGamificationModels() {
  try {
    console.log('Iniciando sincronización de modelos de gamificación...');

    // Sincronizar modelos con la base de datos
    await UserPoints.sync();
    console.log('Modelo UserPoints sincronizado con la base de datos.');

    await Badge.sync();
    console.log('Modelo Badge sincronizado con la base de datos.');

    await UserBadge.sync();
    console.log('Modelo UserBadge sincronizado con la base de datos.');

    console.log('Sincronización de modelos de gamificación completada con éxito.');
  } catch (error) {
    console.error('Error al sincronizar modelos de gamificación:', error);
  } finally {
    // Cerrar conexión
    await sequelize.close();
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  syncGamificationModels()
    .then(() => {
      console.log('Script finalizado.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error en el script:', error);
      process.exit(1);
    });
}

module.exports = syncGamificationModels;
