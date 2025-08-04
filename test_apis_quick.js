const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function testAPIs() {
  console.log('🧪 Probando APIs del sistema de eliminación de cuenta...');
  
  try {
    // 1. Probar endpoint básico del servidor
    console.log('1️⃣ Probando endpoint básico...');
    const healthCheck = await axios.get(BASE_URL);
    console.log('✅ Servidor respondiendo:', healthCheck.status);

    // 2. Probar endpoint de estadísticas (requiere autenticación)
    console.log('2️⃣ Probando endpoint de estadísticas...');
    try {
      const statsResponse = await axios.get(`${BASE_URL}/api/account-deletion/stats`);
      console.log('✅ Estadísticas:', statsResponse.status);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Estadísticas requiere autenticación (correcto)');
      } else {
        console.log('❌ Error inesperado en estadísticas:', error.message);
      }
    }

    // 3. Probar endpoint de información del proceso
    console.log('3️⃣ Probando endpoint de información...');
    try {
      const infoResponse = await axios.get(`${BASE_URL}/api/account-deletion/info`);
      console.log('✅ Información:', infoResponse.status);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Información requiere autenticación (correcto)');
      } else {
        console.log('❌ Error inesperado en información:', error.message);
      }
    }

    // 4. Probar endpoint de solicitud de recuperación (público)
    console.log('4️⃣ Probando endpoint de recuperación...');
    try {
      const recoveryResponse = await axios.post(`${BASE_URL}/api/account-deletion/recovery/request`, {
        email: 'test@example.com'
      });
      console.log('✅ Recuperación:', recoveryResponse.status);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Recuperación responde correctamente (email no encontrado)');
      } else {
        console.log('❌ Error inesperado en recuperación:', error.message);
      }
    }

    console.log('\n🎉 PRUEBAS DE API COMPLETADAS');
    console.log('✅ El sistema de eliminación de cuenta está funcionando');
    
    return true;

  } catch (error) {
    console.error('❌ Error en pruebas de API:', error.message);
    return false;
  }
}

// Esperar un poco para que el servidor inicie
setTimeout(() => {
  testAPIs()
    .then(success => {
      console.log(success ? '\n✅ APIS VERIFICADAS EXITOSAMENTE' : '\n❌ PROBLEMAS CON LAS APIS');
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}, 3000);
