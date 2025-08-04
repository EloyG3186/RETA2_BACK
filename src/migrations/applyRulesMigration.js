// Script para añadir la columna 'rules' a la tabla 'challenges'
const { sequelize } = require('../config/database');

async function applyRulesMigration() {
  try {
    console.log('🚀 Iniciando migración de reglas...');
    
    // Verificar si la columna ya existe
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'challenges' AND column_name = 'rules';
    `);
    
    if (results.length > 0) {
      console.log('✅ La columna "rules" ya existe en la tabla "challenges"');
    } else {
      // Añadir columna rules a la tabla challenges
      await sequelize.query(`
        ALTER TABLE challenges 
        ADD COLUMN rules TEXT;
      `);
      
      console.log('✅ Migración completada: columna "rules" añadida a la tabla "challenges"');
    }
    
    // Verificar que la columna se creó correctamente
    const [verification] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'challenges' AND column_name = 'rules';
    `);
    
    if (verification.length > 0) {
      console.log('🔍 Verificación exitosa:', verification[0]);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración de reglas:', error);
    process.exit(1);
  }
}

// Ejecutar la migración
applyRulesMigration();
