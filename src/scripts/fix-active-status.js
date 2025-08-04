const { sequelize } = require('../config/database');

async function fixActiveStatus() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Iniciando corrección de valores "active" en el enum...');
    
    // 1. Primero agregar 'active' temporalmente al enum
    console.log('Paso 1: Agregando "active" temporalmente al enum...');
    await sequelize.query(`
      ALTER TYPE "enum_challenges_status" ADD VALUE IF NOT EXISTS 'active';
    `, { transaction });
    
    console.log('Valor "active" agregado temporalmente al enum');
    
    // 2. Actualizar todos los registros con 'active' a 'in_progress'
    console.log('Paso 2: Actualizando registros con status "active" a "in_progress"...');
    const [results] = await sequelize.query(`
      UPDATE "challenges" 
      SET "status" = 'in_progress' 
      WHERE "status" = 'active';
    `, { transaction });
    
    console.log(`${results.rowCount || 0} registros actualizados de "active" a "in_progress"`);
    
    // 3. Verificar que no queden registros con 'active'
    const [activeRecords] = await sequelize.query(`
      SELECT COUNT(*) as count FROM "challenges" WHERE "status" = 'active';
    `, { transaction });
    
    console.log(`Registros restantes con status "active": ${activeRecords[0].count}`);
    
    if (activeRecords[0].count > 0) {
      throw new Error('Aún quedan registros con status "active"');
    }
    
    await transaction.commit();
    console.log('Corrección completada exitosamente');
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error al corregir el enum:', error);
    throw error;
  }
}

// Ejecutar el script
fixActiveStatus()
  .then(() => {
    console.log('Script ejecutado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error en el script:', error);
    process.exit(1);
  });
