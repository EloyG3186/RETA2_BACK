const axios = require('axios');

// Configuración
const BASE_URL = 'http://localhost:5001';
const CHALLENGE_ID = '962281f1-2b7d-4ba6-af00-337bbb53689c'; // Desafío 19
const JUDGE_ID = '0b4cb600-e339-4aa6-bdac-8ec24f73f112'; // EloyG5

// Token JWT del juez EloyG5 (obtenido del localStorage del navegador)
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjBiNGNiNjAwLWUzMzktNGFhNi1iZGFjLThlYzI0ZjczZjExMiIsImlhdCI6MTc1Mjk3OTU2NiwiZXhwIjoxNzUzNTg0MzY2fQ.HtF_ni0mjwoOqmjxZHXRxdegI7xzwOx9JEzU4GZBaso';

async function testJudgeAcceptance() {
  console.log(' Iniciando prueba de aceptación de juez...');
  console.log(' Desafío:', CHALLENGE_ID);
  console.log(' Juez:', JUDGE_ID);
  console.log('🧪 Iniciando prueba de aceptación de juez...');
  console.log('📋 Desafío:', CHALLENGE_ID);
  console.log('👨‍⚖️ Juez:', JUDGE_ID);

  try {
    const response = await axios.post(
      `${BASE_URL}/api/judge/challenges/${CHALLENGE_ID}/accept-assignment`,
      { judgeId: JUDGE_ID },
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 segundos de timeout
      }
    );

    console.log('✅ ÉXITO - Juez aceptado correctamente');
    console.log('📊 Status:', response.status);
    console.log('📊 Status Text:', response.statusText);
    console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.log('❌ ERROR - Detalles del error:');
    console.log('📊 Status:', error.response?.status);
    console.log('📊 Status Text:', error.response?.statusText);
    console.log('📊 Headers:', error.response?.headers);
    console.log('📊 Data:', error.response?.data);
    console.log('📊 Stack trace:', error.stack);
  }
}

testJudgeAcceptance();
