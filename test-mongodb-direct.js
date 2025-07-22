// Test directo de MongoDB y el modelo FriendNetwork
const mongoose = require('mongoose');

async function testMongoDBConnection() {
  try {
    console.log('🔍 Probando conexión directa a MongoDB...');
    
    // Conectar a MongoDB usando la misma configuración que el backend
    await mongoose.connect('mongodb://localhost:27017/challenge_friends_social');
    console.log('✅ Conectado a MongoDB');
    
    // Definir el esquema exactamente como está en el backend
    const friendNetworkSchema = new mongoose.Schema({
      userId: String,
      friends: [{
        users: [String],
        status: String,
        createdAt: { type: Date, default: Date.now }
      }]
    });
    
    const FriendNetwork = mongoose.model('FriendNetwork', friendNetworkSchema);
    console.log('✅ Modelo FriendNetwork creado');
    
    // Buscar la red de amigos de EloyG
    const eloyGUserId = '91f709ca-3830-488c-9168-fbe5bd68ba90';
    console.log(`🔍 Buscando red de amigos para userId: ${eloyGUserId}`);
    
    const friendNetwork = await FriendNetwork.findOne({ userId: eloyGUserId });
    
    if (!friendNetwork) {
      console.log('❌ No se encontró red de amigos');
      
      // Listar todos los documentos para debug
      console.log('🔍 Listando todos los documentos en la colección...');
      const allNetworks = await FriendNetwork.find({});
      console.log(`📊 Total documentos: ${allNetworks.length}`);
      
      allNetworks.forEach((network, index) => {
        console.log(`${index + 1}. UserId: ${network.userId}`);
      });
      
    } else {
      console.log('✅ Red de amigos encontrada:');
      console.log('UserId:', friendNetwork.userId);
      console.log('Total amistades:', friendNetwork.friends.length);
      
      friendNetwork.friends.forEach((friendship, index) => {
        console.log(`${index + 1}. Users: [${friendship.users.join(', ')}], Status: ${friendship.status}`);
      });
      
      // Simular la lógica de extracción de IDs
      console.log('\\n🔍 Simulando extracción de IDs de amigos...');
      const friendIds = [];
      
      for (const friendship of friendNetwork.friends) {
        console.log('Procesando amistad:', {
          users: friendship.users,
          status: friendship.status
        });
        
        if (friendship.status === 'active' && friendship.users && friendship.users.length > 0) {
          const friendId = friendship.users.find(id => id !== eloyGUserId);
          console.log(`Usuario actual: ${eloyGUserId}, Amigo: ${friendId}`);
          
          if (friendId) {
            friendIds.push(friendId);
            console.log(`✅ Agregado: ${friendId}`);
          }
        }
      }
      
      console.log('\\n📋 IDs de amigos extraídos:', friendIds);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔚 Desconectado de MongoDB');
  }
}

testMongoDBConnection();
