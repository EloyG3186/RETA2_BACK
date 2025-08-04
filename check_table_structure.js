const { sequelize } = require('./src/config/database');

async function checkTableStructure() {
  try {
    console.log('🔍 Verificando estructura de la tabla challenges...\n');
    
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'challenges' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Columnas encontradas:');
    results.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('\n🔍 Buscando columnas relacionadas con bet/stake...');
    const betColumns = results.filter(row => 
      row.column_name.toLowerCase().includes('bet') || 
      row.column_name.toLowerCase().includes('stake') ||
      row.column_name.toLowerCase().includes('prize')
    );
    
    if (betColumns.length > 0) {
      console.log('💰 Columnas de apuesta encontradas:');
      betColumns.forEach(row => {
        console.log(`- ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('❌ No se encontraron columnas de apuesta');
    }
    
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
  }
}

checkTableStructure();
