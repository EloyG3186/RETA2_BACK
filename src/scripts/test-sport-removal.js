const axios = require('axios');

async function testSportRemoval() {
  try {
    console.log('🧪 Probando API después de eliminar campo sport...');
    
    const response = await axios.get('http://localhost:5001/api/challenges');
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      const challenge = response.data.data[0];
      
      console.log('✅ API responde correctamente');
      console.log('📋 Challenge example:');
      console.log('- Title:', challenge.title);
      console.log('- Category:', challenge.category);
      console.log('- CategoryName:', challenge.categoryName);
      console.log('- Sport field exists:', 'sport' in challenge ? 'SÍ' : 'NO');
      
      if ('sport' in challenge) {
        console.log('❌ ERROR: El campo sport aún existe en la respuesta');
        console.log('- Sport value:', challenge.sport);
      } else {
        console.log('✅ ÉXITO: El campo sport ha sido eliminado correctamente');
      }
    } else {
      console.log('❌ No se encontraron desafíos en la respuesta');
    }
    
  } catch (error) {
    console.error('❌ Error al probar la API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testSportRemoval();
}

module.exports = testSportRemoval;
