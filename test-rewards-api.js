const axios = require('axios');

// Script de prueba para verificar endpoints de recompensas
const testRewardsAPI = async () => {
  try {
    console.log('🧪 Iniciando pruebas de API de recompensas...');
    
    const baseURL = 'http://localhost:5001';
    
    // Test 1: Obtener reglas de recompensas (sin auth para testing)
    console.log('\n1️⃣ Probando GET /api/rewards/rules...');
    try {
      const response = await axios.get(`${baseURL}/api/rewards/rules`);
      console.log('✅ Reglas obtenidas:', response.data.length, 'reglas encontradas');
      console.log('Primera regla:', response.data[0]);
    } catch (error) {
      console.log('❌ Error al obtener reglas:', error.response?.status, error.message);
    }
    
    // Test 2: Endpoint de admin (sin auth para testing)
    console.log('\n2️⃣ Probando GET /api/rewards/admin/rules...');
    try {
      const response = await axios.get(`${baseURL}/api/rewards/admin/rules`);
      console.log('✅ Reglas admin obtenidas:', response.data.length, 'reglas encontradas');
    } catch (error) {
      console.log('❌ Error al obtener reglas admin:', error.response?.status, error.message);
    }
    
    console.log('\n🎉 Pruebas completadas');
    
  } catch (error) {
    console.error('❌ Error en pruebas:', error.message);
  }
};

testRewardsAPI();
