const axios = require('axios');

// Configuración
const BASE_URL = 'http://localhost:5001';

// Token JWT del creador EloyG
const CREATOR_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjkxZjcwOWNhLTM4MzAtNDg4Yy05MTY4LWZiZTViZDY4YmE5MCIsImlhdCI6MTc1Mjk3OTU2NiwiZXhwIjoxNzUzNTg0MzY2fQ.PLACEHOLDER';

// Token JWT del juez EloyG5
const JUDGE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjBiNGNiNjAwLWUzMzktNGFhNi1iZGFjLThlYzI0ZjczZjExMiIsImlhdCI6MTc1Mjk3OTU2NiwiZXhwIjoxNzUzNTg0MzY2fQ.HtF_ni0mjwoOqmjxZHXRxdegI7xzwOx9JEzU4GZBaso';

const JUDGE_ID = '0b4cb600-e339-4aa6-bdac-8ec24f73f112'; // EloyG5

async function createAndTestJudgeFlow() {
  console.log('🧪 Iniciando flujo completo de prueba de juez...');

  try {
    // Paso 1: Crear desafío
    console.log('\n📋 Paso 1: Creando desafío...');
    const challengeData = {
      title: 'Desafío Test Juez ' + Date.now(),
      description: 'Desafío para probar la aceptación de juez',
      category: 'Aprendizaje',
      entryFee: 100,
      maxParticipants: 2,
      startDate: new Date(Date.now() + 60000).toISOString(), // 1 minuto en el futuro
      endDate: new Date(Date.now() + 3600000).toISOString(), // 1 hora en el futuro
      isPrivate: false
    };

    const createResponse = await axios.post(
      `${BASE_URL}/api/challenges`,
      challengeData,
      {
        headers: {
          'Authorization': `Bearer ${CREATOR_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const challengeId = createResponse.data.data.id;
    console.log('✅ Desafío creado exitosamente');
    console.log('📋 ID del desafío:', challengeId);

    // Paso 2: Asignar juez
    console.log('\n👨‍⚖️ Paso 2: Asignando juez...');
    const assignResponse = await axios.post(
      `${BASE_URL}/api/judge/challenges/${challengeId}/assign-judge`,
      { judgeId: JUDGE_ID },
      {
        headers: {
          'Authorization': `Bearer ${CREATOR_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ Juez asignado exitosamente');
    console.log('📊 Estado del desafío:', assignResponse.data.data?.status);

    // Paso 3: Aceptar como juez
    console.log('\n✋ Paso 3: Aceptando asignación como juez...');
    const acceptResponse = await axios.post(
      `${BASE_URL}/api/judge/challenges/${challengeId}/accept-assignment`,
      { judgeId: JUDGE_ID },
      {
        headers: {
          'Authorization': `Bearer ${JUDGE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('🎉 ¡ÉXITO COMPLETO!');
    console.log('📊 Estado final:', acceptResponse.data.data?.status);
    console.log('📋 Desafío ID:', challengeId);

  } catch (error) {
    console.log('❌ ERROR en el flujo:');
    console.log('📊 Status:', error.response?.status);
    console.log('📊 Status Text:', error.response?.statusText);
    console.log('📊 Data:', error.response?.data);
    console.log('📊 URL:', error.config?.url);
    console.log('📊 Method:', error.config?.method);
    console.log('📊 Stack trace:', error.stack);
  }
}

createAndTestJudgeFlow();
