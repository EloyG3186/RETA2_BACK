const axios = require('axios');

async function testCurrentChallenge() {
  try {
    console.log('🧪 Probando asignación de juez al desafío actual...');

    const challengeId = 'f8f327d1-5d2f-47b7-8143-bb517b3e3a0a';
    const judgeId = '0b4cb600-e339-4aa6-bdac-8ec24f73f112';
    
    // Simular la petición exacta que hace el frontend
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjkxZjcwOWNhLTM4MzAtNDg4Yy05MTY4LWZiZTViZDY4YmE5MCIsImlhdCI6MTc1Mjk1MzgwOSwiZXhwIjoxNzUzNTU4NjA5fQ.5nOU3fk4pGyCqMOiqYLlhh_N-1-iZnuzog0LgCNiYyA';
    
    console.log(`🔍 Challenge ID: ${challengeId}`);
    console.log(`👤 Judge ID: ${judgeId}`);
    console.log(`🔑 Token (primeros 50 chars): ${token.substring(0, 50)}...`);

    const response = await axios.post(
      `http://localhost:3000/api/judge/challenges/${challengeId}/assign-judge`,
      { judgeId },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Respuesta exitosa:', response.status);
    console.log('📋 Datos de respuesta:', response.data);

  } catch (error) {
    console.error('❌ Error en la petición:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Data:', error.response?.data);
    console.error('Headers:', error.response?.headers);
    
    if (error.response?.status === 500) {
      console.error('🔍 Error 500 - Detalles del servidor:', error.response.data);
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testCurrentChallenge()
    .then(() => {
      console.log('✅ Prueba completada');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error en la prueba:', error);
      process.exit(1);
    });
}

module.exports = testCurrentChallenge;
