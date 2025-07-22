const http = require('http');

function testAPI() {
  console.log('🔍 Testing /api/challenges endpoint...');
  
  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/challenges',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log(`✅ API Response Status: ${res.statusCode}`);
        console.log(`📊 Challenges count: ${response.data ? response.data.length : 'N/A'}`);
        
        if (response.data && response.data.length > 0) {
          console.log('\n🎯 First 3 challenges category info:');
          response.data.slice(0, 3).forEach((challenge, index) => {
            console.log(`   ${index + 1}. ${challenge.title}`);
            console.log(`      category: "${challenge.category}"`);
            console.log(`      categoryName: "${challenge.categoryName || 'N/A'}"`);
            console.log(`      categoryId: "${challenge.categoryId || 'N/A'}"`);
            console.log('');
          });
        }
      } catch (err) {
        console.error('❌ Error parsing JSON:', err);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ Request error:', err);
  });

  req.end();
}

testAPI();
