const axios = require('axios');

async function debugLeaderboard() {
  try {
    console.log('🔍 Debug del endpoint leaderboard...\n');
    
    const response = await axios.get('http://localhost:5001/api/gamification/leaderboard?limit=10');
    
    console.log('📊 Status:', response.status);
    console.log('📊 Headers:', response.headers['content-type']);
    console.log('📊 Data type:', typeof response.data);
    console.log('📊 Is Array:', Array.isArray(response.data));
    console.log('📊 Data length:', response.data?.length);
    console.log('📊 Raw response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

debugLeaderboard();
