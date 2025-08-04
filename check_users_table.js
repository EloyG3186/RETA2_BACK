const { sequelize } = require('./src/config/database');

async function checkUsersTable() {
  try {
    console.log('🔍 Verificando estructura de la tabla users...\n');
    
    const [results] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Columnas encontradas:');
    results.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
    
    console.log('\n👥 Verificando usuarios EloyG y Gonza25...');
    const [users] = await sequelize.query(`
      SELECT id, username, email, first_name, last_name, full_name
      FROM users 
      WHERE username IN ('EloyG', 'Gonza25')
    `);
    
    users.forEach(user => {
      console.log(`- ${user.username}: ${user.first_name || user.full_name || 'Sin nombre'}`);
    });
    
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
  }
}

checkUsersTable();
