// Script para sincronizar las tablas de reglas (rules y rule_compliance)
const { sequelize } = require('../config/database');
const Rule = require('../models/Rule');
const RuleCompliance = require('../models/RuleCompliance');

async function syncRulesTables() {
  try {
    console.log('🚀 Iniciando sincronización de tablas de reglas...');
    
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida');
    
    // Sincronizar tabla rules
    await Rule.sync({ alter: true });
    console.log('✅ Tabla "rules" sincronizada');
    
    // Sincronizar tabla rule_compliance
    await RuleCompliance.sync({ alter: true });
    console.log('✅ Tabla "rule_compliance" sincronizada');
    
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
    
    console.log('🎉 Sincronización completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la sincronización de tablas de reglas:', error);
    process.exit(1);
  }
}

// Ejecutar la sincronización
syncRulesTables();
