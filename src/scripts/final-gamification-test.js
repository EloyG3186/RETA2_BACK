const axios = require('axios');

async function finalTest() {
  console.log('🎯 PRUEBA FINAL DE ENDPOINTS DE GAMIFICACIÓN\n');
  
  const BASE_URL = 'http://localhost:5001/api/gamification';
  
  // No necesita token real porque el middleware permite desarrollo sin autenticación
  const config = {
    headers: {
      'Authorization': 'Bearer fake-token'
    },
    timeout: 10000
  };
  
  const endpoints = [
    { name: 'User Points', url: '/points' },
    { name: 'User Badges', url: '/badges' },
    { name: 'User Rank', url: '/rank' },
    { name: 'Leaderboard', url: '/leaderboard' }
  ];
  
  let allWorking = true;
  
  for (const endpoint of endpoints) {
    console.log(`🧪 Probando ${endpoint.name}...`);
    try {
      const response = await axios.get(BASE_URL + endpoint.url, config);
      console.log(`✅ ${endpoint.name}: Status ${response.status}`);
      console.log(`   Data preview: ${JSON.stringify(response.data).substring(0, 100)}...`);
    } catch (error) {
      const status = error.response?.status || 'TIMEOUT';
      const message = error.response?.data?.message || error.message;
      console.log(`❌ ${endpoint.name}: Error ${status} - ${message}`);
      allWorking = false;
    }
    console.log('');
  }
  
  if (allWorking) {
    console.log('🎉 ¡TODOS LOS ENDPOINTS DE GAMIFICACIÓN FUNCIONAN CORRECTAMENTE!');
    console.log('✅ El frontend ahora puede cargar datos reales de gamificación.');
  } else {
    console.log('⚠️  Algunos endpoints tienen problemas. Revisa los errores arriba.');
  }
}

finalTest().catch(console.error);
