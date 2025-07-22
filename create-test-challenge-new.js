const axios = require('axios');

// Configuración
const BASE_URL = 'http://localhost:5001';

// Token JWT del creador EloyG
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjkxZjcwOWNhLTM4MzAtNDg4Yy05MTY4LWZiZTViZDY4YmE5MCIsImlhdCI6MTc1Mjk3OTU2NiwiZXhwIjoxNzUzNTg0MzY2fQ.PLACEHOLDER';

async function createTestChallenge() {
  console.log('🧪 Creando desafío de prueba...');

  try {
    const challengeData = {
      title: 'Desafío Test Juez',
      description: 'Desafío para probar la aceptación de juez',
      category: 'Aprendizaje',
      entryFee: 50,
      maxParticipants: 2,
      startDate: new Date(Date.now() + 60000).toISOString(), // 1 minuto en el futuro
      endDate: new Date(Date.now() + 3600000).toISOString(), // 1 hora en el futuro
      isPrivate: false
    };

    const response = await axios.post(
      `${BASE_URL}/api/challenges`,
      challengeData,
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ Desafío creado exitosamente');
    console.log('📋 ID del desafío:', response.data.data.id);
    console.log('📊 Datos completos:', JSON.stringify(response.data, null, 2));

    return response.data.data.id;

  } catch (error) {
    console.log('❌ ERROR al crear desafío:');
    console.log('📊 Status:', error.response?.status);
    console.log('📊 Data:', error.response?.data);
    console.log('📊 Stack trace:', error.stack);
  }
}

createTestChallenge();
