const axios = require('axios');

async function quickTest() {
  try {
    console.log('🧪 Prueba rápida del leaderboard...');
    
    const response = await axios.get('http://localhost:5001/api/gamification/leaderboard?limit=5');
    
    console.log('Status:', response.status);
    console.log('Data structure:', typeof response.data);
    console.log('Has leaderboard array:', Array.isArray(response.data?.leaderboard));
    
    if (response.data?.leaderboard) {
      console.log('Usuarios en leaderboard:');
      response.data.leaderboard.forEach(user => {
        console.log(`- ${user.username} (${user.fullName})`);
      });
      
      // Verificar si admin123 aparece
      const hasAdmin = response.data.leaderboard.some(user => 
        user.username.includes('admin') || user.fullName.toLowerCase().includes('admin')
      );
      
      console.log('¿Aparece admin?', hasAdmin ? '❌ SÍ' : '✅ NO');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

quickTest();
