const { sequelize } = require('./src/config/database');

async function verifyMigration() {
  try {
    console.log('🔍 Verificando migración...');
    
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL');

    // Verificar columnas en users
    const [userColumns] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('account_status', 'privacy_level', 'deactivated_at', 'privacy_deleted_at', 'audit_retention', 'legal_hold_until')
      ORDER BY column_name
    `);
    
    console.log('\n📋 Columnas agregadas a users:');
    userColumns.forEach(col => {
      console.log(`  ✅ ${col.column_name} (${col.data_type})`);
    });

    // Verificar nuevas tablas
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('user_audit_trail', 'user_legal_holds', 'user_exit_surveys', 'account_recovery_requests')
      ORDER BY table_name
    `);
    
    console.log('\n📋 Nuevas tablas creadas:');
    tables.forEach(table => {
      console.log(`  ✅ ${table.table_name}`);
    });

    // Probar modelos Sequelize
    console.log('\n🔧 Probando modelos Sequelize...');
    try {
      const models = require('./src/models');
      console.log('✅ Modelos cargados correctamente');
      
      // Verificar que los nuevos modelos existan
      const newModels = ['UserAuditTrail', 'UserLegalHold', 'UserExitSurvey', 'AccountRecoveryRequest'];
      newModels.forEach(modelName => {
        if (models[modelName]) {
          console.log(`  ✅ Modelo ${modelName} disponible`);
        } else {
          console.log(`  ❌ Modelo ${modelName} no encontrado`);
        }
      });
      
    } catch (error) {
      console.error('❌ Error cargando modelos:', error.message);
    }

    console.log('\n🎉 Verificación completada');
    return true;

  } catch (error) {
    console.error('❌ Error en verificación:', error.message);
    return false;
  } finally {
    await sequelize.close();
  }
}

verifyMigration()
  .then(success => {
    console.log(success ? '\n✅ Todo está funcionando correctamente' : '\n❌ Hay problemas que resolver');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
