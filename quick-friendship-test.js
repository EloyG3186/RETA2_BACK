const { mongoose } = require('./src/config/mongodb');
const { FriendNetwork, Friendship } = require('./src/models').mongoModels;

async function quickTest() {
  try {
    // Crear una amistad de prueba directamente
    const userId1 = "11111111-1111-1111-1111-111111111111"; // Usuario de prueba
    const userId2 = "70306b00-578a-49fe-b6b6-d3e6af18ed55"; // UsuarioNuevo
    
    console.log('Creando amistad de prueba...');
    
    // Crear amistad
    const friendship = new Friendship({
      users: [userId1, userId2],
      status: 'active',
      since: new Date()
    });
    
    await friendship.save();
    console.log('Amistad creada:', friendship._id);
    
    // Actualizar red del usuario 1
    let network1 = await FriendNetwork.findOne({ userId: userId1 });
    if (!network1) {
      network1 = new FriendNetwork({
        userId: userId1,
        friends: [],
        pendingRequests: [],
        sentRequests: [],
        blockedUsers: []
      });
    }
    
    network1.friends.push(friendship._id);
    await network1.save();
    console.log('Red actualizada para usuario 1');
    
    // Verificar
    const updatedNetwork = await FriendNetwork.findOne({ userId: userId1 }).populate('friends');
    console.log('Amigos en la red:', updatedNetwork.friends.length);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

quickTest();
