const axios = require('axios');

async function testSimple() {
  try {
    console.log('🔗 [TEST] Probando conexión básica...');
    
    // 1. Probar que el servidor responde
    const healthCheck = await axios.get('http://localhost:5001/api/users/dev-login/eloy.gonzalezja2@gmail.com');
    console.log('✅ [TEST] Servidor responde. Token:', healthCheck.data.token ? 'SÍ' : 'NO');
    
    const token = healthCheck.data.token;
    
    // 2. Probar el endpoint by-ids
    console.log('📞 [TEST] Probando endpoint by-ids...');
    
    const response = await axios.post('http://localhost:5001/api/users/by-ids', 
      { 
        userIds: ['91f709ca-3830-488c-9168-fbe5bd68ba90'] 
      },
      { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );
    
    console.log('🎯 [TEST] Respuesta:', response.data);
    
  } catch (error) {
    console.error('❌ [TEST] Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code
    });
  }
}

testSimple();
