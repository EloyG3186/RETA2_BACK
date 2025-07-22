const { mongoose } = require('./src/config/mongodb');
const { sequelize } = require('./src/config/database');
const { User } = require('./src/models');
const { FriendNetwork, FriendRequest, Friendship } = require('./src/models').mongoModels;

async function createTestFriendships() {
  try {
    console.log('🔍 Conectando a las bases de datos...');
    
    // Obtener usuarios existentes
    const users = await User.findAll({ limit: 5 });
    console.log(`📊 Usuarios encontrados: ${users.length}`);
    
    if (users.length < 2) {
      console.log('❌ Se necesitan al menos 2 usuarios para crear amistades');
      return;
    }
    
    // Tomar los primeros dos usuarios para crear una amistad
    const user1 = users[0];
    const user2 = users[1];
    
    console.log(`👥 Creando amistad entre ${user1.username} (${user1.id}) y ${user2.username} (${user2.id})`);
    
    // Crear la relación de amistad
    const friendship = new Friendship({
      users: [user1.id, user2.id],
      status: 'active',
      since: new Date()
    });
    
    await friendship.save();
    console.log('✅ Amistad creada:', friendship._id);
    
    // Buscar o crear redes de amistad para ambos usuarios
    let network1 = await FriendNetwork.findOne({ userId: user1.id });
    if (!network1) {
      network1 = new FriendNetwork({
        userId: user1.id,
        friends: [],
        pendingRequests: [],
        sentRequests: [],
        blockedUsers: []
      });
    }
    
    let network2 = await FriendNetwork.findOne({ userId: user2.id });
    if (!network2) {
      network2 = new FriendNetwork({
        userId: user2.id,
        friends: [],
        pendingRequests: [],
        sentRequests: [],
        blockedUsers: []
      });
    }
    
    // Agregar la amistad a ambas redes
    if (!network1.friends.includes(friendship._id)) {
      network1.friends.push(friendship._id);
      await network1.save();
      console.log(`✅ Amistad agregada a la red de ${user1.username}`);
    }
    
    if (!network2.friends.includes(friendship._id)) {
      network2.friends.push(friendship._id);
      await network2.save();
      console.log(`✅ Amistad agregada a la red de ${user2.username}`);
    }
    
    // Crear más amistades si hay más usuarios
    if (users.length >= 3) {
      const user3 = users[2];
      console.log(`👥 Creando amistad entre ${user1.username} y ${user3.username}`);
      
      const friendship2 = new Friendship({
        users: [user1.id, user3.id],
        status: 'active',
        since: new Date()
      });
      
      await friendship2.save();
      
      let network3 = await FriendNetwork.findOne({ userId: user3.id });
      if (!network3) {
        network3 = new FriendNetwork({
          userId: user3.id,
          friends: [],
          pendingRequests: [],
          sentRequests: [],
          blockedUsers: []
        });
      }
      
      network1.friends.push(friendship2._id);
      await network1.save();
      
      network3.friends.push(friendship2._id);
      await network3.save();
      
      console.log('✅ Segunda amistad creada');
    }
    
    console.log('🎉 Datos de prueba de amistades creados exitosamente');
    
    // Verificar los datos creados
    console.log('\n📊 Verificando datos creados:');
    const updatedNetwork1 = await FriendNetwork.findOne({ userId: user1.id }).populate('friends');
    console.log(`${user1.username} tiene ${updatedNetwork1.friends.length} amigos`);
    
  } catch (error) {
    console.error('❌ Error al crear datos de prueba:', error);
  } finally {
    process.exit(0);
  }
}

createTestFriendships();
