// Script para crear la tabla rule_compliance
const { sequelize } = require('../config/database');

async function createRuleComplianceTable() {
  try {
    console.log('🚀 Iniciando creación de tabla rule_compliance...');
    
    // Verificar si la tabla ya existe
    const [tableExists] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'rule_compliance' AND table_schema = 'public';
    `);
    
    if (tableExists.length > 0) {
      console.log('✅ La tabla "rule_compliance" ya existe');
    } else {
      // Crear tabla rule_compliance
      await sequelize.query(`
        CREATE TABLE rule_compliance (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "ruleId" UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
          "participantId" UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
          "judgeId" UUID NOT NULL REFERENCES users(id),
          "isCompliant" BOOLEAN NULL,
          "judgeComments" TEXT,
          "evaluatedAt" TIMESTAMP NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE("ruleId", "participantId")
        );
      `);
      
      // Crear índices
      await sequelize.query(`
        CREATE INDEX idx_rule_compliance_rule ON rule_compliance("ruleId");
      `);
      
      await sequelize.query(`
        CREATE INDEX idx_rule_compliance_participant ON rule_compliance("participantId");
      `);
      
      await sequelize.query(`
        CREATE INDEX idx_rule_compliance_judge ON rule_compliance("judgeId");
      `);
      
      console.log('✅ Tabla "rule_compliance" creada exitosamente con índices');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la creación de tabla rule_compliance:', error);
    process.exit(1);
  }
}

// Ejecutar la migración
createRuleComplianceTable();
