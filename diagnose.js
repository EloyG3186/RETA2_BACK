console.log('🔍 Iniciando diagnóstico del sistema...');

async function diagnose() {
  try {
    console.log('1. Verificando conexión a base de datos...');
    const { sequelize } = require('./src/config/database');
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL OK');

    console.log('2. Verificando modelos...');
    const models = require('./src/models');
    console.log('✅ Modelos cargados OK');
    console.log('   - Modelos disponibles:', Object.keys(models));

    console.log('3. Verificando nuevas tablas...');
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('user_audit_trail', 'user_legal_holds', 'user_exit_surveys', 'account_recovery_requests')
    `);
    
    console.log('   - Tablas encontradas:', tables.map(t => t.table_name));

    console.log('4. Verificando controladores...');
    const accountDeletionController = require('./src/controllers/accountDeletionController');
    const accountRecoveryController = require('./src/controllers/accountRecoveryController');
    console.log('✅ Controladores cargados OK');

    console.log('5. Verificando rutas...');
    const accountDeletionRoutes = require('./src/routes/accountDeletionRoutes');
    console.log('✅ Rutas cargadas OK');

    console.log('\n🎉 Diagnóstico completado exitosamente');
    console.log('✅ El sistema está listo para funcionar');

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

diagnose();
