const { mongoose } = require('./src/config/mongodb');
const { sequelize } = require('./src/config/database');
const { User } = require('./src/models');
const { FriendNetwork, Friendship } = require('./src/models').mongoModels;

async function addTestFriendship() {
  try {
    console.log('🔗 Conectando a las bases de datos...');
    
    // Obtener usuarios existentes
    const users = await User.findAll({ 
      attributes: ['id', 'username', 'fullName'],
      limit: 10 
    });
    
    console.log(`👥 Usuarios encontrados: ${users.length}`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.fullName}) - ID: ${user.id}`);
    });
    
    if (users.length < 2) {
      console.log('❌ Se necesitan al menos 2 usuarios para crear una amistad');
      return;
    }
    
    // Usar el primer usuario (que parece ser el usuario de prueba principal)
    const user1 = users[0]; // UsuarioNuevo
    const user2 = users[1]; // NUEVO USUARIO 2
    
    console.log(`\n🤝 Creando amistad entre:`);
    console.log(`   Usuario 1: ${user1.username} (${user1.fullName})`);
    console.log(`   Usuario 2: ${user2.username} (${user2.fullName})`);
    
    // Verificar si ya existe una amistad
    const existingFriendship = await Friendship.findOne({
      users: { $all: [user1.id, user2.id] }
    });
    
    if (existingFriendship) {
      console.log('⚠️  Ya existe una amistad entre estos usuarios');
      console.log('Amistad existente:', existingFriendship._id);
    } else {
      // Crear nueva amistad
      const friendship = new Friendship({
        users: [user1.id, user2.id],
        status: 'active',
        since: new Date(),
        lastInteraction: new Date(),
        challengesCount: 0
      });
      
      const savedFriendship = await friendship.save();
      console.log('✅ Nueva amistad creada:', savedFriendship._id);
      
      // Actualizar o crear redes de amistad
      for (const user of [user1, user2]) {
        let network = await FriendNetwork.findOne({ userId: user.id });
        
        if (!network) {
          network = new FriendNetwork({
            userId: user.id,
            friends: [savedFriendship._id],
            pendingRequests: [],
            sentRequests: [],
            blockedUsers: []
          });
          console.log(`📊 Creando nueva red para ${user.username}`);
        } else {
          if (!network.friends.includes(savedFriendship._id)) {
            network.friends.push(savedFriendship._id);
            console.log(`📊 Agregando amistad a la red de ${user.username}`);
          }
        }
        
        await network.save();
      }
    }
    
    // Verificar el resultado
    console.log('\n🔍 Verificando redes de amistad:');
    for (const user of [user1, user2]) {
      const network = await FriendNetwork.findOne({ userId: user.id }).populate('friends');
      console.log(`${user.username}: ${network ? network.friends.length : 0} amigos`);
      
      if (network && network.friends.length > 0) {
        network.friends.forEach((friendship, index) => {
          console.log(`  ${index + 1}. Amistad con usuarios: ${friendship.users.join(', ')}`);
        });
      }
    }
    
    console.log('\n🎉 Proceso completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Cerrar conexiones
    await mongoose.connection.close();
    await sequelize.close();
    process.exit(0);
  }
}

// Ejecutar la función
addTestFriendship();
