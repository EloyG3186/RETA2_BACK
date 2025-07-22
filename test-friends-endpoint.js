const axios = require('axios');

// Token de prueba para EloyG
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4LTkwYWItY2RlZi0xMjM0LTU2Nzg5MGFiY2RlZiIsInVzZXJuYW1lIjoiRWxveUciLCJlbWFpbCI6ImVsb3lnQGV4YW1wbGUuY29tIiwiaWF0IjoxNzM3MDk2MDk4LCJleHAiOjE3MzcxODI0OTh9.Hy7Qs2qJKfLUJJqzJQJQJQJQJQJQJQJQJQJQJQJQJQJ';

async function testFriendsEndpoint() {
  try {
    console.log('🔍 Probando endpoint /api/friends/...');
    
    const response = await axios.get('http://localhost:5001/api/friends/', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Respuesta exitosa:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data) {
      const friendNetwork = response.data.data;
      console.log('\n📊 Análisis de la red de amigos:');
      console.log('- Usuario ID:', friendNetwork.userId);
      console.log('- Número de amigos:', friendNetwork.friends ? friendNetwork.friends.length : 0);
      console.log('- Solicitudes pendientes:', friendNetwork.pendingRequests ? friendNetwork.pendingRequests.length : 0);
      console.log('- Solicitudes enviadas:', friendNetwork.sentRequests ? friendNetwork.sentRequests.length : 0);
      console.log('- Usuarios bloqueados:', friendNetwork.blockedUsers ? friendNetwork.blockedUsers.length : 0);
      
      if (friendNetwork.friends && friendNetwork.friends.length > 0) {
        console.log('\n👥 Detalles de amigos:');
        friendNetwork.friends.forEach((friendship, index) => {
          console.log(`${index + 1}. Amistad ID:`, friendship._id);
          console.log(`   Usuarios:`, friendship.users);
          console.log(`   Estado:`, friendship.status);
          console.log(`   Desde:`, friendship.since);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error al probar endpoint:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.message);
    console.error('Data:', error.response?.data);
  }
}

async function testUsersEndpoint() {
  try {
    console.log('\n🔍 Probando endpoint /api/users/friends (anterior)...');
    
    const response = await axios.get('http://localhost:5001/api/users/friends', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Respuesta exitosa:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error al probar endpoint /api/users/friends:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.message);
    console.error('Data:', error.response?.data);
  }
}

// Ejecutar pruebas
testFriendsEndpoint().then(() => {
  return testUsersEndpoint();
}).then(() => {
  console.log('\n✅ Pruebas completadas');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error general:', error);
  process.exit(1);
});
