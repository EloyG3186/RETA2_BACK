const axios = require('axios');

// Configuración
const BASE_URL = 'http://localhost:5001';
const CHALLENGE_ID = '41ffb168-070e-4337-b8c7-2b60fb8253f5'; // Desafío 15
const JUDGE_ID = '0b4cb600-e339-4aa6-bdac-8ec24f73f112';

// Token JWT actual (del localStorage del navegador)
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjkxZjcwOWNhLTM4MzAtNDg4Yy05MTY4LWZiZTViZDY4YmE5MCIsInVzZXJuYW1lIjoiRWxveUciLCJlbWFpbCI6ImVsb3kuZ29uemFsZXpqYTJAZ21haWwuY29tIiwiaWF0IjoxNzM3MzQ0MzQ5LCJleHAiOjE3Mzc0MzA3NDl9.HFLvVPJWJWOVvQfnlUOKgKPJQlwUJdSRNRSFLjGZLMQ';

async function testJudgeAssignment() {
  try {
    console.log('🧪 Iniciando prueba de asignación de juez...');
    console.log(`📋 Desafío: ${CHALLENGE_ID}`);
    console.log(`👨‍⚖️ Juez: ${JUDGE_ID}`);
    console.log('');

    const response = await axios.post(
      `${BASE_URL}/api/judge/challenges/${CHALLENGE_ID}/assign-judge`,
      {
        judgeId: JUDGE_ID
      },
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 segundos de timeout
      }
    );

    console.log('✅ ÉXITO - Respuesta del servidor:');
    console.log('📊 Status:', response.status);
    console.log('📊 Status Text:', response.statusText);
    console.log('📊 Headers:', response.headers);
    console.log('📊 Data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.log('❌ ERROR - Detalles del error:');
    
    if (error.response) {
      // Error de respuesta del servidor
      console.log('📊 Status:', error.response.status);
      console.log('📊 Status Text:', error.response.statusText);
      console.log('📊 Headers:', error.response.headers);
      console.log('📊 Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // Error de red
      console.log('🌐 Error de red - No se recibió respuesta');
      console.log('📊 Request:', error.request);
    } else {
      // Error de configuración
      console.log('⚙️ Error de configuración:', error.message);
    }
    
    console.log('📊 Stack trace:', error.stack);
  }
}

// Ejecutar la prueba
testJudgeAssignment();
