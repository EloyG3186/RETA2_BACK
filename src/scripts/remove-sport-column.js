const { sequelize } = require('../models');

async function removeSportColumn() {
  try {
    console.log('🗑️ Eliminando columna "sport" de la tabla challenges...');
    
    // Eliminar la columna sport de la tabla challenges
    await sequelize.getQueryInterface().removeColumn('challenges', 'sport');
    
    console.log('✅ Columna "sport" eliminada exitosamente');
    
    // Verificar que la columna se eliminó
    const tableDescription = await sequelize.getQueryInterface().describeTable('challenges');
    
    if (!tableDescription.sport) {
      console.log('✅ Verificación exitosa: La columna "sport" ya no existe en la tabla');
    } else {
      console.log('❌ Error: La columna "sport" aún existe en la tabla');
    }
    
  } catch (error) {
    console.error('❌ Error al eliminar la columna sport:', error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  removeSportColumn();
}

module.exports = removeSportColumn;
