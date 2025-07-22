const http = require('http');

// Función simple para hacer una petición HTTP
function makeRequest(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
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
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function testEndpoints() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4LTkwYWItY2RlZi0xMjM0LTU2Nzg5MGFiY2RlZiIsInVzZXJuYW1lIjoiRWxveUciLCJlbWFpbCI6ImVsb3lnQGV4YW1wbGUuY29tIiwiaWF0IjoxNzM3MDk2MDk4LCJleHAiOjE3MzcxODI0OTh9.Hy7Qs2qJKfLUJJqzJQJQJQJQJQJQJQJQJQJQJQJQJQJ';

  console.log('🔍 Probando endpoint /api/friends/...');
  try {
    const friendsResult = await makeRequest('/api/friends/', token);
    console.log('✅ Status:', friendsResult.status);
    console.log('📄 Response:', JSON.stringify(friendsResult.data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n🔍 Probando endpoint /api/users/friends...');
  try {
    const usersResult = await makeRequest('/api/users/friends', token);
    console.log('✅ Status:', usersResult.status);
    console.log('📄 Response:', JSON.stringify(usersResult.data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEndpoints();
