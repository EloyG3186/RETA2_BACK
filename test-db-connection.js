const { sequelize } = require('./src/config/database');
const { User } = require('./src/models');

async function testConnection() {
  try {
    console.log('🔌 Probando conexión a PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL exitosa');
    
    console.log('📊 Contando usuarios...');
    const userCount = await User.count();
    console.log(`👥 Total de usuarios: ${userCount}`);
    
    if (userCount > 0) {
      console.log('📋 Primeros 5 usuarios:');
      const users = await User.findAll({ 
        limit: 5,
        attributes: ['id', 'email', 'username', 'profilePicture'] 
      });
      users.forEach(user => {
        console.log(`- ${user.email} (${user.username}) - Avatar: ${user.profilePicture}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
  } finally {
    await sequelize.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
}

testConnection();
