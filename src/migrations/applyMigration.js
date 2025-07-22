// Script para añadir la columna 'location' a la tabla 'users'
const { sequelize } = require('../config/database');

async function applyMigration() {
  try {
    console.log('Iniciando migración...');
    
    // Añadir columna location a la tabla users
    await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255);`);
    
    console.log('✅ Migración completada: columna location añadida a la tabla users');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
}

// Ejecutar la migración
applyMigration();
