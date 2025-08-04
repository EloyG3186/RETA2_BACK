const fs = require('fs');
const path = require('path');
const { sequelize } = require('./src/config/database');

async function runSimpleMigration() {
  console.log('🚀 Ejecutando migración simple...');

  try {
    // Verificar conexión
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL');

    // Leer migración simple
    const migrationPath = path.join(__dirname, 'migrations', 'simple_migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Ejecutar como un solo bloque
    await sequelize.query(migrationSQL);
    console.log('✅ Migración ejecutada exitosamente');

    // Verificar tablas
    const tables = ['user_audit_trail', 'user_legal_holds', 'user_exit_surveys', 'account_recovery_requests'];
    
    for (const table of tables) {
      try {
        const [results] = await sequelize.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`✅ Tabla ${table} verificada`);
      } catch (error) {
        console.log(`❌ Error verificando ${table}: ${error.message}`);
      }
    }

    console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
    return true;

  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    return false;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  runSimpleMigration()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { runSimpleMigration };
