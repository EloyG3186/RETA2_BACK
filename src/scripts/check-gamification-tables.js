const { sequelize } = require('../config/database');

async function checkGamificationTables() {
  console.log('🔍 Verificando tablas de gamificación...\n');
  
  try {
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos exitosa');

    // Verificar qué tablas existen
    const queryInterface = sequelize.getQueryInterface();
    
    // Obtener todas las tablas
    const tables = await queryInterface.showAllTables();
    console.log('\n📋 Tablas existentes:', tables);
    
    // Verificar tablas específicas de gamificación
    const gamificationTables = ['UserPoints', 'Badges', 'UserBadges'];
    
    console.log('\n🎮 Verificando tablas de gamificación:');
    for (const table of gamificationTables) {
      const exists = tables.includes(table);
      console.log(`   ${exists ? '✅' : '❌'} ${table}: ${exists ? 'Existe' : 'No existe'}`);
      
      if (exists) {
        try {
          // Intentar describir la tabla
          const tableInfo = await queryInterface.describeTable(table);
          console.log(`      Columnas: ${Object.keys(tableInfo).join(', ')}`);
        } catch (error) {
          console.log(`      Error al describir tabla: ${error.message}`);
        }
      }
    }
    
    // Intentar crear las tablas si no existen
    console.log('\n🔧 Sincronizando modelos de gamificación...');
    
    // Importar modelos
    const { UserPoints, Badge, UserBadge } = require('../models');
    
    // Sincronizar las tablas (crear si no existen)
    await UserPoints.sync({ alter: true });
    console.log('   ✅ UserPoints sincronizado');
    
    await Badge.sync({ alter: true });
    console.log('   ✅ Badge sincronizado');
    
    await UserBadge.sync({ alter: true });
    console.log('   ✅ UserBadge sincronizado');
    
    console.log('\n🎯 Verificación completada');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  checkGamificationTables()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error general:', error.message);
      process.exit(1);
    });
}

module.exports = checkGamificationTables;
