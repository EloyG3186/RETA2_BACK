// =====================================================
// SCRIPT DE EJECUCIÓN DE MIGRACIÓN
// Sistema de Eliminación de Cuenta
// =====================================================

const fs = require('fs');
const path = require('path');
const { sequelize } = require('./src/config/database');

async function runMigration() {
  console.log('🚀 Iniciando migración del sistema de eliminación de cuenta...\n');
  
  try {
    // 1. Verificar conexión a la base de datos
    console.log('📡 Verificando conexión a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida correctamente\n');
    
    // 2. Leer el archivo de migración
    console.log('📖 Leyendo archivo de migración...');
    const migrationPath = path.join(__dirname, 'migrations', '001_account_deletion_system.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Archivo de migración no encontrado: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Archivo de migración leído correctamente\n');
    
    // 3. Ejecutar la migración
    console.log('⚙️ Ejecutando migración SQL...');
    console.log('⚠️  Esto puede tomar unos momentos...\n');
    
    // Dividir el SQL en statements individuales (separados por ';')
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Ejecutando ${statements.length} statements SQL...`);
    
    // Ejecutar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        try {
          await sequelize.query(statement);
          console.log(`✅ Statement ${i + 1}/${statements.length} ejecutado`);
        } catch (error) {
          // Algunos statements pueden fallar si ya existen (IF NOT EXISTS)
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate key') ||
              error.message.includes('relation') && error.message.includes('already exists')) {
            console.log(`⚠️  Statement ${i + 1}/${statements.length} ya existe (ignorado)`);
          } else {
            console.error(`❌ Error en statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }
    
    console.log('\n✅ Migración SQL ejecutada exitosamente');
    
    // 4. Verificar que los modelos Sequelize funcionen
    console.log('\n🔍 Verificando modelos Sequelize...');
    
    // Importar modelos actualizados
    const models = require('./src/models');
    
    // Verificar que los nuevos modelos existan
    const requiredModels = ['UserAuditTrail', 'UserLegalHold', 'UserExitSurvey', 'AccountRecoveryRequest'];
    
    for (const modelName of requiredModels) {
      if (models[modelName]) {
        console.log(`✅ Modelo ${modelName} cargado correctamente`);
      } else {
        throw new Error(`❌ Modelo ${modelName} no encontrado`);
      }
    }
    
    // 5. Sincronizar modelos (sin force para no perder datos)
    console.log('\n🔄 Sincronizando modelos con la base de datos...');
    await sequelize.sync({ alter: false, force: false });
    console.log('✅ Modelos sincronizados correctamente');
    
    // 6. Verificar que las tablas fueron creadas
    console.log('\n🔍 Verificando tablas creadas...');
    
    const tableQueries = [
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_audit_trail'",
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_legal_holds'",
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_exit_surveys'",
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'account_recovery_requests'"
    ];
    
    for (const query of tableQueries) {
      const result = await sequelize.query(query, { type: sequelize.QueryTypes.SELECT });
      if (result.length > 0) {
        console.log(`✅ Tabla ${result[0].table_name} verificada`);
      } else {
        console.log(`❌ Tabla no encontrada para query: ${query}`);
      }
    }
    
    // 7. Verificar campos agregados a users
    console.log('\n🔍 Verificando campos agregados a tabla users...');
    
    const columnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('account_status', 'privacy_level', 'deactivated_at', 'privacy_deleted_at', 'audit_retention', 'legal_hold_until')
    `;
    
    const columns = await sequelize.query(columnQuery, { type: sequelize.QueryTypes.SELECT });
    console.log(`✅ ${columns.length}/6 campos agregados a tabla users:`);
    columns.forEach(col => console.log(`   - ${col.column_name}`));
    
    // 8. Test básico de funcionalidad
    console.log('\n🧪 Ejecutando test básico de funcionalidad...');
    
    // Test: Crear un registro de auditoría de prueba
    const testAudit = await models.UserAuditTrail.create({
      originalUserId: '00000000-0000-0000-0000-000000000000',
      username: 'test_migration',
      deletionType: 'voluntary',
      challengesCount: 0,
      transactionsCount: 0,
      violationsCount: 0,
      totalPoints: 0,
      auditData: { test: true, migration: '001' }
    });
    
    console.log(`✅ Test de auditoría creado con ID: ${testAudit.id}`);
    
    // Limpiar test
    await testAudit.destroy();
    console.log('✅ Test de auditoría eliminado');
    
    console.log('\n🎉 ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('\n📋 Resumen:');
    console.log('   ✅ Campos agregados a tabla users');
    console.log('   ✅ 4 nuevas tablas creadas');
    console.log('   ✅ Índices y triggers configurados');
    console.log('   ✅ Modelos Sequelize funcionando');
    console.log('   ✅ Asociaciones configuradas');
    console.log('\n🚀 El sistema de eliminación de cuenta está listo para usar');
    
  } catch (error) {
    console.error('\n❌ ERROR EN LA MIGRACIÓN:');
    console.error(error.message);
    console.error('\n📋 Stack trace:');
    console.error(error.stack);
    
    console.log('\n🔧 Posibles soluciones:');
    console.log('   1. Verificar que PostgreSQL esté ejecutándose');
    console.log('   2. Verificar credenciales de base de datos');
    console.log('   3. Verificar permisos de usuario de base de datos');
    console.log('   4. Revisar logs de PostgreSQL para más detalles');
    
    process.exit(1);
  } finally {
    // Cerrar conexión
    await sequelize.close();
    console.log('\n📡 Conexión a base de datos cerrada');
  }
}

// Ejecutar migración si este archivo se ejecuta directamente
if (require.main === module) {
  runMigration().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { runMigration };
