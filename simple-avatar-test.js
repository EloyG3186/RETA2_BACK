const axios = require('axios');

async function testAvatarUrls() {
  console.log('🧪 Probando URLs de avatares...');
  
  const baseUrl = 'http://localhost:5001';
  const testFiles = [
    'default-profile.png',
    'nonexistent.jpg',
    'avatar-1750803649150-901475741.PNG'
  ];
  
  for (const filename of testFiles) {
    try {
      console.log(`\n🔍 Probando: ${filename}`);
      
      // Probar endpoint /api/avatars/
      const response = await axios.get(`${baseUrl}/api/avatars/${filename}`, {
        responseType: 'arraybuffer',
        timeout: 5000
      });
      
      console.log(`✅ /api/avatars/${filename}:`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${response.headers['content-type']}`);
      console.log(`   Size: ${response.headers['content-length']} bytes`);
      
    } catch (error) {
      console.log(`❌ /api/avatars/${filename}:`);
      console.log(`   Error: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
      }
    }
    
    try {
      // Probar ruta directa /uploads/avatars/
      const response2 = await axios.get(`${baseUrl}/uploads/avatars/${filename}`, {
        responseType: 'arraybuffer',
        timeout: 5000
      });
      
      console.log(`✅ /uploads/avatars/${filename}:`);
      console.log(`   Status: ${response2.status}`);
      console.log(`   Content-Type: ${response2.headers['content-type']}`);
      console.log(`   Size: ${response2.headers['content-length']} bytes`);
      
    } catch (error) {
      console.log(`❌ /uploads/avatars/${filename}:`);
      console.log(`   Error: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
      }
    }
  }
}

testAvatarUrls().catch(console.error);
