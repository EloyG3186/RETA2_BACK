const { sequelize } = require('../config/database');

async function step1AddActiveToEnum() {
  try {
    console.log('Paso 1: Agregando "active" temporalmente al enum...');
    await sequelize.query(`
      ALTER TYPE "enum_challenges_status" ADD VALUE IF NOT EXISTS 'active';
    `);
    console.log('✓ Valor "active" agregado al enum');
  } catch (error) {
    console.error('Error en paso 1:', error.message);
    throw error;
  }
}

async function step2UpdateRecords() {
  try {
    console.log('Paso 2: Actualizando registros con status "active" a "in_progress"...');
    const [results] = await sequelize.query(`
      UPDATE "challenges" 
      SET "status" = 'in_progress' 
      WHERE "status" = 'active';
    `);
    console.log(`✓ ${results.rowCount || 0} registros actualizados de "active" a "in_progress"`);
  } catch (error) {
    console.error('Error en paso 2:', error.message);
    throw error;
  }
}

async function step3VerifyNoActiveRecords() {
  try {
    console.log('Paso 3: Verificando que no queden registros con "active"...');
    const [activeRecords] = await sequelize.query(`
      SELECT COUNT(*) as count FROM "challenges" WHERE "status" = 'active';
    `);
    console.log(`✓ Registros restantes con status "active": ${activeRecords[0].count}`);
    
    if (activeRecords[0].count > 0) {
      throw new Error('Aún quedan registros con status "active"');
    }
  } catch (error) {
    console.error('Error en paso 3:', error.message);
    throw error;
  }
}

async function fixActiveStatusSteps() {
  try {
    console.log('Iniciando corrección de valores "active" en el enum...\n');
    
    await step1AddActiveToEnum();
    console.log('Esperando un momento para que PostgreSQL confirme el cambio...\n');
    
    // Esperar un poco para que PostgreSQL confirme el cambio
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await step2UpdateRecords();
    console.log();
    
    await step3VerifyNoActiveRecords();
    console.log();
    
    console.log('✓ Corrección completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error al corregir el enum:', error);
    throw error;
  }
}

// Ejecutar el script
fixActiveStatusSteps()
  .then(() => {
    console.log('Script ejecutado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error en el script:', error);
    process.exit(1);
  });
