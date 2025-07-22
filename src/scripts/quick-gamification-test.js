const axios = require('axios');

async function quickTest() {
  const BASE_URL = 'http://localhost:5001/api/gamification';
  
  console.log('🔥 Prueba rápida de endpoints de gamificación');
  console.log('URL Base:', BASE_URL);
  
  const tests = [
    { name: 'Points', endpoint: '/points' },
    { name: 'Badges', endpoint: '/badges' },
    { name: 'Rank', endpoint: '/rank' },
    { name: 'Leaderboard', endpoint: '/leaderboard' }
  ];
  
  for (const test of tests) {
    console.log(`\n🧪 Probando: ${test.name}`);
    try {
      const response = await axios.get(BASE_URL + test.endpoint, {
        timeout: 5000
      });
      console.log(`✅ ${test.name}: Status ${response.status}`);
      console.log(`   Data:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log(`❌ ${test.name}: Error ${error.response?.status || 'TIMEOUT'}`);
      if (error.response?.data) {
        console.log(`   Error data:`, error.response.data);
      } else {
        console.log(`   Error message:`, error.message);
      }
    }
  }
  
  console.log('\n🎯 Prueba completada');
}

quickTest().catch(console.error);
