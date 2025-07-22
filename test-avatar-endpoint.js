const axios = require('axios');

async function testAvatarEndpoint() {
  const baseUrl = 'http://localhost:5001';
  
  console.log('🧪 Probando endpoint de avatares...');
  
  try {
    // Probar el avatar por defecto
    const response = await axios.get(`${baseUrl}/api/avatars/default-profile.png`, {
      responseType: 'arraybuffer'
    });
    
    console.log('✅ Avatar por defecto encontrado:');
    console.log('- Status:', response.status);
    console.log('- Content-Type:', response.headers['content-type']);
    console.log('- Content-Length:', response.headers['content-length']);
    
  } catch (error) {
    console.error('❌ Error al obtener avatar por defecto:', error.message);
    if (error.response) {
      console.error('- Status:', error.response.status);
      console.error('- Data:', error.response.data);
    }
  }
  
  try {
    // Probar un avatar que no existe
    const response2 = await axios.get(`${baseUrl}/api/avatars/nonexistent.png`, {
      responseType: 'arraybuffer'
    });
    
    console.log('✅ Avatar inexistente (debería devolver default):');
    console.log('- Status:', response2.status);
    console.log('- Content-Type:', response2.headers['content-type']);
    console.log('- Content-Length:', response2.headers['content-length']);
    
  } catch (error) {
    console.error('❌ Error al obtener avatar inexistente:', error.message);
    if (error.response) {
      console.error('- Status:', error.response.status);
    }
  }
}

testAvatarEndpoint();
