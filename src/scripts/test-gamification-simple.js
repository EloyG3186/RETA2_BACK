const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function testGamificationSimple() {
  console.log('🧪 Probando endpoints de gamificación sin autenticación...\n');
  
  // Usar un token de ejemplo (debería fallar con 401 si requiere auth)
  const config = {
    headers: {
      'Authorization': `Bearer fake-token-for-testing`
    }
  };
  
  const endpoints = [
    { name: 'Points', url: '/gamification/points' },
    { name: 'Badges', url: '/gamification/badges' },
    { name: 'Rank', url: '/gamification/rank' },
    { name: 'Leaderboard', url: '/gamification/leaderboard' }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`🔍 Probando ${endpoint.name}: ${endpoint.url}`);
    try {
      const response = await axios.get(`${BASE_URL}${endpoint.url}`, config);
      console.log(`   ✅ ${endpoint.name}: ${response.status} - ${JSON.stringify(response.data).substring(0, 100)}...`);
    } catch (error) {
      const status = error.response?.status || 'No response';
      const data = error.response?.data || error.message;
      console.log(`   ❌ ${endpoint.name}: ${status} - ${JSON.stringify(data).substring(0, 200)}...`);
      
      if (error.response?.status === 401) {
        console.log(`      → Requiere autenticación (esperado)`);
      } else if (error.response?.status === 500) {
        console.log(`      → Error interno del servidor (problema a resolver)`);
      }
    }
    console.log('');
  }
  
  // También probar algunos endpoints básicos para verificar que el servidor funciona
  console.log('🌐 Probando endpoints básicos...');
  
  try {
    const response = await axios.get(`${BASE_URL}/categories`);
    console.log(`   ✅ Categories: ${response.status} - Funciona correctamente`);
  } catch (error) {
    console.log(`   ❌ Categories: ${error.response?.status || 'Error'} - ${error.message}`);
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/challenges`);
    console.log(`   ✅ Challenges: ${response.status} - Funciona correctamente`);
  } catch (error) {
    console.log(`   ❌ Challenges: ${error.response?.status || 'Error'} - ${error.message}`);
  }
}

if (require.main === module) {
  testGamificationSimple()
    .then(() => {
      console.log('🎯 Pruebas completadas');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error general:', error.message);
      process.exit(1);
    });
}

module.exports = testGamificationSimple;
