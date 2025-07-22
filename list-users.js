const { User } = require('./src/models');

async function listUsers() {
  try {
    const users = await User.findAll({ 
      attributes: ['id', 'email', 'username', 'profilePicture'] 
    });
    
    console.log('👥 Usuarios disponibles:');
    users.forEach(user => {
      console.log(`- ${user.email} (${user.username}) - Avatar: ${user.profilePicture}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listUsers();
