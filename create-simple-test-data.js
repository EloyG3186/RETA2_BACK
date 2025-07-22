
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('./src/config/database');
const { User } = require('./src/models');
const { mongoose } = require('./src/config/mongodb');
const { FriendNetwork, Friendship } = require('./src/models').mongoModels;

async function createSimpleTestData() {
  try { 
    console.log('🚀 Creando datos de prueba simples...');
    
    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Crear usuarios de prueba
    const users = [
      {
        id: uuidv4(),
        username: 'testuser1',
        email: 'testuser1@example.com',
        password: hashedPassword,
        fullName: 'Usuario Test 1',
        profilePicture: 'default-profile.png',
        isActive: true,
        emailVerified: true
      },
      {
        id: uuidv4(),
        username: 'testuser2',
        email: 'testuser2@example.com',
        password: hashedPassword,
        fullName: 'Usuario Test 2',
        profilePicture: 'default-profile.png',
        isActive: true,
        emailVerified: true
      },
      {
        id: uuidv4(),
        username: 'testuser3',
        email: 'testuser3@example.com',
        password: hashedPassword,
        fullName: 'Usuario Test 3',
        profilePicture: 'avatar-1750803649150-901475741.PNG', // Avatar personalizado
        isActive: true,
        emailVerified: true
      }
    ];
    
    // Crear usuarios en PostgreSQL
    console.log('👥 Creando usuarios en PostgreSQL...');
    for (const userData of users) {
      await User.create(userData);
      console.log(`✅ Usuario creado: ${userData.username} (${userData.email})`);
    }
    
    // Crear redes de amistad en MongoDB
    console.log('🤝 Creando redes de amistad en MongoDB...');
    
    // Crear redes para cada usuario
    for (const user of users) {
      await FriendNetwork.create({
        userId: user.id,
        friends: [],
        pendingRequests: [],
        sentRequests: [],
        blockedUsers: []
      });
      console.log(`🕸️ Red creada para: ${user.username}`);
    }
    
    // Crear una amistad entre testuser1 y testuser2
    const friendship = await Friendship.create({
      users: [users[0].id, users[1].id],
      status: 'active'
    });
    
    // Actualizar las redes de amistad
    await FriendNetwork.findOneAndUpdate(
      { userId: users[0].id },
      { $addToSet: { friends: friendship._id } }
    );
    
    await FriendNetwork.findOneAndUpdate(
      { userId: users[1].id },
      { $addToSet: { friends: friendship._id } }
    );
    
    console.log('🤝 Amistad creada entre testuser1 y testuser2');
    
    // Crear otra amistad entre testuser1 y testuser3
    const friendship2 = await Friendship.create({
      users: [users[0].id, users[2].id],
      status: 'active'
    });
    
    await FriendNetwork.findOneAndUpdate(
      { userId: users[0].id },
      { $addToSet: { friends: friendship2._id } }
    );
    
    await FriendNetwork.findOneAndUpdate(
      { userId: users[2].id },
      { $addToSet: { friends: friendship2._id } }
    );
    
    console.log('🤝 Amistad creada entre testuser1 y testuser3');
    
    console.log('\n✅ Datos de prueba creados exitosamente!');
    console.log('📋 Usuarios creados:');
    console.log('- testuser1@example.com (password123) - Avatar: default-profile.png');
    console.log('- testuser2@example.com (password123) - Avatar: default-profile.png');
    console.log('- testuser3@example.com (password123) - Avatar: avatar-1750803649150-901475741.PNG');
    console.log('\n🤝 testuser1 tiene 2 amigos: testuser2 y testuser3');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    await sequelize.close();
    process.exit(0);
  }
}

createSimpleTestData();
