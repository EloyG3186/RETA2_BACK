const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function testGamificationEndpoints() {
  console.log('🧪 Probando endpoints de gamificación...\n');
  
  try {
    // Primero necesitamos hacer login para obtener un token
    console.log('📋 1. Haciendo login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('   ✅ Login exitoso');
    
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    // Test 1: Obtener puntos del usuario
    console.log('\n📊 2. Probando /gamification/points...');
    try {
      const pointsResponse = await axios.get(`${BASE_URL}/gamification/points`, config);
      console.log('   ✅ Puntos obtenidos:', pointsResponse.data);
    } catch (error) {
      console.log('   ❌ Error en points:', error.response?.status, error.response?.data || error.message);
    }
    
    // Test 2: Obtener insignias del usuario
    console.log('\n🏅 3. Probando /gamification/badges...');
    try {
      const badgesResponse = await axios.get(`${BASE_URL}/gamification/badges`, config);
      console.log('   ✅ Insignias obtenidas:', badgesResponse.data);
    } catch (error) {
      console.log('   ❌ Error en badges:', error.response?.status, error.response?.data || error.message);
    }
    
    // Test 3: Obtener ranking del usuario
    console.log('\n🏆 4. Probando /gamification/rank...');
    try {
      const rankResponse = await axios.get(`${BASE_URL}/gamification/rank`, config);
      console.log('   ✅ Ranking obtenido:', rankResponse.data);
    } catch (error) {
      console.log('   ❌ Error en rank:', error.response?.status, error.response?.data || error.message);
    }
    
    // Test 4: Obtener leaderboard
    console.log('\n📋 5. Probando /gamification/leaderboard...');
    try {
      const leaderboardResponse = await axios.get(`${BASE_URL}/gamification/leaderboard`, config);
      console.log('   ✅ Leaderboard obtenido:', leaderboardResponse.data);
    } catch (error) {
      console.log('   ❌ Error en leaderboard:', error.response?.status, error.response?.data || error.message);
    }
    
    console.log('\n🎯 Pruebas completadas');
    
  } catch (loginError) {
    console.log('❌ Error en login:', loginError.response?.status, loginError.response?.data || loginError.message);
    console.log('⚠️  No se pudieron probar los endpoints de gamificación sin autenticación');
  }
}

if (require.main === module) {
  testGamificationEndpoints()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error general:', error.message);
      process.exit(1);
    });
}

module.exports = testGamificationEndpoints;
