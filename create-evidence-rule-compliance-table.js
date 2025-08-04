const { sequelize } = require('./src/config/database');

async function createEvidenceRuleComplianceTable() {
  try {
    console.log('🔄 Creando tabla evidence_rule_compliance...');
    
    // Crear la tabla con SQL directo para mayor control
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS evidence_rule_compliance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        evidence_id UUID NOT NULL,
        rule_id UUID NOT NULL,
        participant_id UUID NOT NULL,
        user_id UUID NOT NULL,
        challenge_id UUID NOT NULL,
        claimed_compliance BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        
        -- Constraint único para evitar duplicados
        CONSTRAINT unique_evidence_rule_participant UNIQUE (evidence_id, rule_id, participant_id),
        
        -- Foreign keys
        CONSTRAINT fk_evidence_rule_compliance_evidence 
          FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
        CONSTRAINT fk_evidence_rule_compliance_rule 
          FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE,
        CONSTRAINT fk_evidence_rule_compliance_participant 
          FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
        CONSTRAINT fk_evidence_rule_compliance_user 
          FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT fk_evidence_rule_compliance_challenge 
          FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
      );
    `);
    
    // Crear índices para optimizar consultas
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_evidence_rule_compliance_challenge 
        ON evidence_rule_compliance(challenge_id);
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_evidence_rule_compliance_user 
        ON evidence_rule_compliance(user_id);
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_evidence_rule_compliance_rule 
        ON evidence_rule_compliance(rule_id);
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_evidence_rule_compliance_participant 
        ON evidence_rule_compliance(participant_id);
    `);
    
    console.log('✅ Tabla evidence_rule_compliance creada exitosamente');
    console.log('✅ Índices creados exitosamente');
    console.log('📋 La tabla permite vincular evidencias con reglas por usuario');
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  La tabla evidence_rule_compliance ya existe');
    } else {
      console.error('❌ Error creando tabla evidence_rule_compliance:', error.message);
      throw error;
    }
  } finally {
    await sequelize.close();
  }
}

// Ejecutar la migración
createEvidenceRuleComplianceTable()
  .then(() => {
    console.log('🎉 Migración completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error en la migración:', error);
    process.exit(1);
  });
