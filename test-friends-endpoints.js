const axios = require('axios');

// Configuración
const API_BASE = 'http://localhost:5001/api';
const ELOYG_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjkxZjcwOWNhLTM4MzAtNDg4Yy05MTY4LWZiZTViZDY4YmE5MCIsInVzZXJuYW1lIjoiRWxveUciLCJlbWFpbCI6ImVsb3kuZ29uemFsZXpAZ21haWwuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3Mzc0MzA3NzEsImV4cCI6MTczNzUxNzE3MX0.wTmQcJGvJPqQZMrFgOKrN1Wj3xPVJQZqJPJdOJhJCCo';

async function testFriendsEndpoints() {
  try {
    console.log('🧪 [TEST] Probando endpoints de amigos para EloyG...\n');
    
    // Headers con autenticación
    const headers = {
      'Authorization': `Bearer ${ELOYG_TOKEN}`,
      'Content-Type': 'application/json'
    };
    
    // 1. Probar endpoint /users/friends
    console.log('1️⃣ Probando /users/friends...');
    try {
      const friendsResponse = await axios.get(`${API_BASE}/users/friends`, { headers });
      console.log('✅ Respuesta exitosa:');
      console.log('   Status:', friendsResponse.status);
      console.log('   Data:', JSON.stringify(friendsResponse.data, null, 2));
      
      if (friendsResponse.data.success && friendsResponse.data.data) {
        console.log(`   📊 Total amigos: ${friendsResponse.data.data.length}`);
        friendsResponse.data.data.forEach((friend, index) => {
          console.log(`   ${index + 1}. ${friend.username} - ${friend.fullName}`);
        });
      }
    } catch (error) {
      console.log('❌ Error en /users/friends:');
      console.log('   Status:', error.response?.status);
      console.log('   Message:', error.response?.data?.message || error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 2. Probar endpoint /users/non-friends
    console.log('2️⃣ Probando /users/non-friends...');
    try {
      const nonFriendsResponse = await axios.get(`${API_BASE}/users/non-friends?limit=10`, { headers });
      console.log('✅ Respuesta exitosa:');
      console.log('   Status:', nonFriendsResponse.status);
      console.log('   Data:', JSON.stringify(nonFriendsResponse.data, null, 2));
      
      if (nonFriendsResponse.data.success && nonFriendsResponse.data.data) {
        console.log(`   📊 Total otros usuarios: ${nonFriendsResponse.data.data.length}`);
        nonFriendsResponse.data.data.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.username} - ${user.fullName}`);
        });
      }
    } catch (error) {
      console.log('❌ Error en /users/non-friends:');
      console.log('   Status:', error.response?.status);
      console.log('   Message:', error.response?.data?.message || error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 3. Verificar datos de MongoDB directamente
    console.log('3️⃣ Verificando datos de MongoDB...');
    const mongoose = require('mongoose');
    
    // Conectar a MongoDB
    await mongoose.connect('mongodb://localhost:27017/challenge_friends_social', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Definir el esquema de FriendNetwork
    const friendNetworkSchema = new mongoose.Schema({
      userId: String,
      friends: [{
        users: [String],
        status: String,
        createdAt: { type: Date, default: Date.now }
      }]
    });
    
    const FriendNetwork = mongoose.model('FriendNetwork', friendNetworkSchema);
    
    // Buscar la red de amigos de EloyG
    const eloyGUserId = '91f709ca-3830-488c-9168-fbe5bd68ba90';
    const friendNetwork = await FriendNetwork.findOne({ userId: eloyGUserId });
    
    if (friendNetwork) {
      console.log('✅ Red de amigos encontrada en MongoDB:');
      console.log('   UserId:', friendNetwork.userId);
      console.log('   Total relaciones:', friendNetwork.friends.length);
      
      friendNetwork.friends.forEach((friendship, index) => {
        console.log(`   ${index + 1}. Users: [${friendship.users.join(', ')}], Status: ${friendship.status}`);
      });
    } else {
      console.log('❌ No se encontró red de amigos para EloyG en MongoDB');
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error general en las pruebas:', error.message);
  }
}

// Ejecutar las pruebas
testFriendsEndpoints().then(() => {
  console.log('\n🏁 Pruebas completadas');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
