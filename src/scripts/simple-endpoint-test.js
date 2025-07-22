const http = require('http');

function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: `/api/gamification${path}`,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer fake-token'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data,
            error: 'Invalid JSON'
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 TESTING GAMIFICATION ENDPOINTS\n');
  
  const endpoints = ['/points', '/badges', '/rank', '/leaderboard'];
  
  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint}...`);
    try {
      const result = await testEndpoint(endpoint);
      console.log(`✅ Status: ${result.status}`);
      console.log(`   Data: ${JSON.stringify(result.data).substring(0, 200)}...`);
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    console.log('');
  }
}

runTests().catch(console.error);
