// Script para eliminar y recrear las tablas de reglas completamente
const { sequelize } = require('../config/database');

async function recreateRulesTables() {
  try {
    console.log('🚀 Iniciando recreación de tablas de reglas...');
    
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida');
    
    // Eliminar tablas existentes si existen (en orden correcto por las FK)
    await sequelize.query('DROP TABLE IF EXISTS rule_compliance CASCADE;');
    console.log('🗑️ Tabla "rule_compliance" eliminada');
    
    await sequelize.query('DROP TABLE IF EXISTS rules CASCADE;');
    console.log('🗑️ Tabla "rules" eliminada');
    
    // Crear tabla rules
    await sequelize.query(`
      CREATE TABLE rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 1,
        is_mandatory BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla "rules" creada');
    
    // Crear índices para rules
    await sequelize.query('CREATE INDEX rules_challenge_id ON rules (challenge_id);');
    await sequelize.query('CREATE INDEX rules_challenge_id_order_index ON rules (challenge_id, order_index);');
    console.log('✅ Índices de "rules" creados');
    
    // Crear tabla rule_compliance
    await sequelize.query(`
      CREATE TABLE rule_compliance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_id UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
        participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        judge_id UUID NOT NULL REFERENCES users(id),
        is_compliant BOOLEAN NULL,
        judge_comments TEXT NULL,
        evaluated_at TIMESTAMP WITH TIME ZONE NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE(rule_id, participant_id)
      );
    `);
    console.log('✅ Tabla "rule_compliance" creada');
    
    // Crear índices para rule_compliance
    await sequelize.query('CREATE INDEX rule_compliance_rule_id ON rule_compliance (rule_id);');
    await sequelize.query('CREATE INDEX rule_compliance_participant_id ON rule_compliance (participant_id);');
    await sequelize.query('CREATE INDEX rule_compliance_judge_id ON rule_compliance (judge_id);');
    console.log('✅ Índices de "rule_compliance" creados');
    
    // Verificar que las tablas se crearon correctamente
    const [rulesTable] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'rules';
    `);
    
    const [complianceTable] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'rule_compliance';
    `);
    
    if (rulesTable.length > 0) {
      console.log('🔍 Tabla "rules" verificada exitosamente');
    }
    
    if (complianceTable.length > 0) {
      console.log('🔍 Tabla "rule_compliance" verificada exitosamente');
    }
    
    console.log('🎉 Recreación completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la recreación de tablas de reglas:', error);
    process.exit(1);
  }
}

// Ejecutar la recreación
recreateRulesTables();
