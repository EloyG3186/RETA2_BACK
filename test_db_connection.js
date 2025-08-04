// Test simple de conexión a base de datos
const { sequelize } = require('./src/config/database');

async function testConnection() {
  try {
    console.log('🔍 Probando conexión a PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa a la base de datos');
    
    // Verificar tabla users
    const result = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'users'", 
      { type: sequelize.QueryTypes.SELECT });
    
    if (result.length > 0) {
      console.log('✅ Tabla users encontrada');
    } else {
      console.log('❌ Tabla users no encontrada');
    }
    
    // Verificar campos actuales de users
    const columns = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log(`📊 Tabla users tiene ${columns.length} columnas:`);
    columns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
  } finally {
    await sequelize.close();
  }
}

testConnection();
