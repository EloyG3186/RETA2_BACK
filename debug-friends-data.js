const axios = require('axios');

async function debugFriendsData() {
  console.log('🔍 Debuggeando datos de amigos...');
  
  // Necesitamos un token JWT válido para probar
  const loginData = {
    email: 'test@example.com',
    password: 'password123'
  };
  
  try {
    // 1. Hacer login para obtener token
    console.log('🔐 Haciendo login...');
    const loginResponse = await axios.post('http://localhost:5001/api/users/login', loginData);
    const token = loginResponse.data.token;
    console.log('✅ Login exitoso');
    
    // 2. Obtener red de amigos
    console.log('👥 Obteniendo red de amigos...');
    const friendsResponse = await axios.get('http://localhost:5001/api/friends/', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📊 Respuesta de /api/friends/:');
    console.log(JSON.stringify(friendsResponse.data, null, 2));
    
    if (friendsResponse.data.success && friendsResponse.data.data && friendsResponse.data.data.friends) {
      const friends = friendsResponse.data.data.friends;
      console.log(`\n👫 Encontrados ${friends.length} amigos`);
      
      if (friends.length > 0) {
        // Extraer IDs de amigos
        const friendIds = [];
        const userId = friendsResponse.data.data.userId;
        
        for (const friendship of friends) {
          const friendId = friendship.users.find(id => id !== userId);
          if (friendId) {
            friendIds.push(friendId);
          }
        }
        
        console.log('🆔 IDs de amigos extraídos:', friendIds);
        
        if (friendIds.length > 0) {
          // 3. Obtener datos completos de usuarios
          console.log('📋 Obteniendo datos completos de usuarios...');
          const usersResponse = await axios.post('http://localhost:5001/api/users/by-ids', 
            { userIds: friendIds },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          console.log('📊 Respuesta de /api/users/by-ids:');
          console.log(JSON.stringify(usersResponse.data, null, 2));
          
          if (usersResponse.data.success && usersResponse.data.data) {
            console.log('\n🖼️ Análisis de avatares:');
            usersResponse.data.data.forEach(user => {
              console.log(`- Usuario ${user.username}:`);
              console.log(`  * ID: ${user.id}`);
              console.log(`  * profilePicture: ${user.profilePicture}`);
              console.log(`  * avatar: ${user.avatar}`);
              console.log(`  * URL esperada: http://localhost:5001/api/avatars/${user.profilePicture || 'default-profile.png'}`);
            });
          }
        }
      } else {
        console.log('⚠️ No hay amigos en la red');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

debugFriendsData();
