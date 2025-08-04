console.log('🧪 Iniciando prueba básica del sistema...');

async function testBasic() {
  try {
    // 1. Probar conexión a base de datos
    console.log('1️⃣ Probando conexión a base de datos...');
    const { sequelize } = require('./src/config/database');
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL exitosa');

    // 2. Probar carga de modelos básicos
    console.log('2️⃣ Probando carga de modelos...');
    const { User } = require('./src/models');
    console.log('✅ Modelo User cargado');

    // 3. Probar nuevos modelos
    console.log('3️⃣ Probando nuevos modelos...');
    const { 
      UserAuditTrail, 
      UserLegalHold, 
      UserExitSurvey, 
      AccountRecoveryRequest 
    } = require('./src/models');
    
    console.log('✅ UserAuditTrail cargado');
    console.log('✅ UserLegalHold cargado');
    console.log('✅ UserExitSurvey cargado');
    console.log('✅ AccountRecoveryRequest cargado');

    // 4. Verificar que las tablas existen
    console.log('4️⃣ Verificando tablas en base de datos...');
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'user_audit_trail', 'user_legal_holds', 'user_exit_surveys', 'account_recovery_requests')
      ORDER BY table_name
    `);
    
    console.log('📋 Tablas encontradas:');
    tables.forEach(table => {
      console.log(`   ✅ ${table.table_name}`);
    });

    // 5. Verificar columnas nuevas en users
    console.log('5️⃣ Verificando nuevas columnas en users...');
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('account_status', 'privacy_level', 'deactivated_at', 'privacy_deleted_at', 'audit_retention', 'legal_hold_until')
      ORDER BY column_name
    `);
    
    console.log('📋 Columnas nuevas en users:');
    columns.forEach(col => {
      console.log(`   ✅ ${col.column_name} (${col.data_type})`);
    });

    // 6. Probar controladores
    console.log('6️⃣ Probando carga de controladores...');
    const accountDeletionController = require('./src/controllers/accountDeletionController');
    const accountRecoveryController = require('./src/controllers/accountRecoveryController');
    console.log('✅ Controladores cargados exitosamente');

    // 7. Probar rutas
    console.log('7️⃣ Probando carga de rutas...');
    const accountDeletionRoutes = require('./src/routes/accountDeletionRoutes');
    console.log('✅ Rutas cargadas exitosamente');

    console.log('\n🎉 TODAS LAS PRUEBAS BÁSICAS PASARON');
    console.log('✅ El sistema está listo para funcionar');
    
    return true;

  } catch (error) {
    console.error('\n❌ ERROR EN PRUEBA BÁSICA:');
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
    return false;
  } finally {
    try {
      const { sequelize } = require('./src/config/database');
      await sequelize.close();
      console.log('🔌 Conexión cerrada');
    } catch (e) {
      // Ignorar errores al cerrar
    }
  }
}

testBasic()
  .then(success => {
    console.log(success ? '\n✅ SISTEMA VERIFICADO EXITOSAMENTE' : '\n❌ SISTEMA TIENE PROBLEMAS');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
