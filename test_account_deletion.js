const axios = require('axios');

// =====================================================
// SCRIPT DE PRUEBA PARA SISTEMA DE ELIMINACIÓN DE CUENTA
// =====================================================

const BASE_URL = 'http://localhost:5001/api/account-deletion';

// Configuración de prueba
const testConfig = {
  // Usuario de prueba (debe existir en la base de datos)
  testUserId: '91f709ca-3830-488c-9168-fbe5bd68ba90',
  testEmail: 'eloy.gonzalezja2@gmail.com',
  testPassword: 'password123'
};

/**
 * Hacer petición HTTP con manejo de errores
 */
async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 500,
      error: error.response?.data || error.message
    };
  }
}

/**
 * Probar obtención de estadísticas del usuario
 */
async function testGetUserStats() {
  console.log('\n📊 Probando obtención de estadísticas del usuario...');
  
  const result = await makeRequest('GET', '/stats');
  
  if (result.success) {
    console.log('✅ Estadísticas obtenidas exitosamente');
    console.log('📈 Datos:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Error obteniendo estadísticas:', result.error);
  }
  
  return result;
}

/**
 * Probar obtención de información del proceso
 */
async function testGetDeletionInfo() {
  console.log('\n📋 Probando obtención de información del proceso...');
  
  const result = await makeRequest('GET', '/info');
  
  if (result.success) {
    console.log('✅ Información obtenida exitosamente');
    console.log('📄 Datos:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Error obteniendo información:', result.error);
  }
  
  return result;
}

/**
 * Probar exportación de datos del usuario
 */
async function testExportUserData() {
  console.log('\n📦 Probando exportación de datos del usuario...');
  
  const result = await makeRequest('GET', '/export');
  
  if (result.success) {
    console.log('✅ Datos exportados exitosamente');
    console.log('📊 Resumen de exportación:', {
      totalItems: Object.keys(result.data.data || {}).length,
      exportedAt: result.data.exportedAt
    });
  } else {
    console.log('❌ Error exportando datos:', result.error);
  }
  
  return result;
}

/**
 * Probar envío de encuesta de salida
 */
async function testSubmitExitSurvey() {
  console.log('\n📝 Probando envío de encuesta de salida...');
  
  const surveyData = {
    primaryReason: 'lack_of_time',
    detailedReason: 'No tengo suficiente tiempo para usar la plataforma',
    overallSatisfaction: 7,
    recommendationLikelihood: 6,
    featuresUsed: ['challenges', 'friends', 'leaderboard'],
    suggestions: 'Mejorar la interfaz de usuario y agregar más notificaciones'
  };
  
  const result = await makeRequest('POST', '/survey', surveyData);
  
  if (result.success) {
    console.log('✅ Encuesta enviada exitosamente');
    console.log('📋 Respuesta:', result.data.message);
  } else {
    console.log('❌ Error enviando encuesta:', result.error);
  }
  
  return result;
}

/**
 * Probar solicitud de recuperación de cuenta
 */
async function testRequestAccountRecovery() {
  console.log('\n🔄 Probando solicitud de recuperación de cuenta...');
  
  const recoveryData = {
    email: testConfig.testEmail
  };
  
  const result = await makeRequest('POST', '/recovery/request', recoveryData);
  
  if (result.success) {
    console.log('✅ Solicitud de recuperación creada exitosamente');
    console.log('🔑 Datos de recuperación:', {
      requestId: result.data.data.requestId,
      recoveryType: result.data.data.recoveryType,
      expiresAt: result.data.data.expiresAt
    });
    return result.data.data.requestId;
  } else {
    console.log('❌ Error solicitando recuperación:', result.error);
    return null;
  }
}

/**
 * Probar obtención de estado de recuperación
 */
async function testGetRecoveryStatus(requestId) {
  if (!requestId) {
    console.log('⚠️ No hay requestId para probar estado de recuperación');
    return null;
  }
  
  console.log('\n📊 Probando obtención de estado de recuperación...');
  
  const result = await makeRequest('GET', `/recovery/${requestId}/status`);
  
  if (result.success) {
    console.log('✅ Estado de recuperación obtenido exitosamente');
    console.log('📈 Estado:', {
      status: result.data.data.status,
      recoveryType: result.data.data.recoveryType,
      isExpired: result.data.data.isExpired
    });
  } else {
    console.log('❌ Error obteniendo estado:', result.error);
  }
  
  return result;
}

/**
 * Probar desactivación de cuenta (simulada)
 */
async function testDeactivateAccount() {
  console.log('\n⚠️ Probando desactivación de cuenta (SIMULADA)...');
  console.log('⚠️ NOTA: Esta prueba NO desactivará realmente la cuenta');
  
  // En lugar de hacer la petición real, solo mostramos cómo sería
  const deactivationData = {
    password: testConfig.testPassword,
    reason: 'testing_purposes',
    confirmUsername: 'EloyG'
  };
  
  console.log('📋 Datos que se enviarían:', {
    reason: deactivationData.reason,
    confirmUsername: deactivationData.confirmUsername,
    passwordProvided: '***'
  });
  
  console.log('⚠️ Para probar realmente, descomenta la línea de abajo:');
  console.log('// const result = await makeRequest("POST", "/deactivate", deactivationData);');
  
  return { success: true, simulated: true };
}

/**
 * Ejecutar todas las pruebas
 */
async function runAllTests() {
  console.log('🧪 INICIANDO PRUEBAS DEL SISTEMA DE ELIMINACIÓN DE CUENTA');
  console.log('=' .repeat(60));
  
  const results = {};
  
  try {
    // Pruebas de información y estadísticas
    results.stats = await testGetUserStats();
    results.info = await testGetDeletionInfo();
    results.export = await testExportUserData();
    
    // Pruebas de encuesta
    results.survey = await testSubmitExitSurvey();
    
    // Pruebas de recuperación
    const requestId = await testRequestAccountRecovery();
    if (requestId) {
      results.recoveryStatus = await testGetRecoveryStatus(requestId);
    }
    
    // Prueba simulada de desactivación
    results.deactivation = await testDeactivateAccount();
    
    // Resumen de resultados
    console.log('\n📊 RESUMEN DE PRUEBAS');
    console.log('=' .repeat(40));
    
    const testNames = {
      stats: 'Estadísticas del usuario',
      info: 'Información del proceso',
      export: 'Exportación de datos',
      survey: 'Encuesta de salida',
      recoveryStatus: 'Estado de recuperación',
      deactivation: 'Desactivación (simulada)'
    };
    
    Object.entries(results).forEach(([key, result]) => {
      const status = result?.success ? '✅' : '❌';
      console.log(`${status} ${testNames[key] || key}`);
    });
    
    const successCount = Object.values(results).filter(r => r?.success).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`\n📈 Resultado final: ${successCount}/${totalCount} pruebas exitosas`);
    
    if (successCount === totalCount) {
      console.log('🎉 ¡Todas las pruebas pasaron exitosamente!');
    } else {
      console.log('⚠️ Algunas pruebas fallaron. Revisa los logs arriba.');
    }
    
  } catch (error) {
    console.error('❌ Error ejecutando pruebas:', error);
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Iniciando script de prueba del sistema de eliminación de cuenta...');
  console.log(`🌐 URL base: ${BASE_URL}`);
  console.log(`👤 Usuario de prueba: ${testConfig.testUserId}`);
  
  // Verificar que el servidor esté corriendo
  try {
    const healthCheck = await axios.get('http://localhost:5001/');
    console.log('✅ Servidor backend está corriendo');
  } catch (error) {
    console.log('❌ Error: El servidor backend no está corriendo en el puerto 5001');
    console.log('💡 Asegúrate de ejecutar: npm start en el directorio del backend');
    return;
  }
  
  await runAllTests();
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testGetUserStats,
  testGetDeletionInfo,
  testExportUserData,
  testSubmitExitSurvey,
  testRequestAccountRecovery,
  testGetRecoveryStatus,
  runAllTests
};
