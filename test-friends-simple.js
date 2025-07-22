const axios = require('axios');

async function testFriendsEndpoint() {
  try {
    console.log('🧪 Probando endpoint /users/friends...');
    
    const response = await axios.get('http://localhost:5001/api/users/friends', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjkxZjcwOWNhLTM4MzAtNDg4Yy05MTY4LWZiZTViZDY4YmE5MCIsInVzZXJuYW1lIjoiRWxveUciLCJlbWFpbCI6ImVsb3kuZ29uemFsZXpAZ21haWwuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3Mzc0MzA3NzEsImV4cCI6MTczNzUxNzE3MX0.wTmQcJGvJPqQZMrFgOKrN1Wj3xPVJQZqJPJdOJhJCCo'
      }
    });
    
    console.log('✅ Respuesta exitosa:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Error:');
    console.log('Status:', error.response?.status);
    console.log('Data:', error.response?.data);
    console.log('Message:', error.message);
  }
}

testFriendsEndpoint();
