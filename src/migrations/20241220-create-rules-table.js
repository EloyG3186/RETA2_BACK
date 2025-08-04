// Script para crear la tabla rules
const { sequelize } = require('../config/database');

async function createRulesTable() {
  try {
    console.log('🚀 Iniciando creación de tabla rules...');
    
    // Verificar si la tabla ya existe
    const [tableExists] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'rules' AND table_schema = 'public';
    `);
    
    if (tableExists.length > 0) {
      console.log('✅ La tabla "rules" ya existe');
    } else {
      // Crear tabla rules
      await sequelize.query(`
        CREATE TABLE rules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "challengeId" UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
          description TEXT NOT NULL,
          "orderIndex" INTEGER NOT NULL DEFAULT 1,
          "isMandatory" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Crear índices
      await sequelize.query(`
        CREATE INDEX idx_rules_challenge_id ON rules("challengeId");
      `);
      
      await sequelize.query(`
        CREATE INDEX idx_rules_order ON rules("challengeId", "orderIndex");
      `);
      
      console.log('✅ Tabla "rules" creada exitosamente con índices');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la creación de tabla rules:', error);
    process.exit(1);
  }
}

// Ejecutar la migración
createRulesTable();
