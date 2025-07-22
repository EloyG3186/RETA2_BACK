const axios = require('axios');

async function testChallengesAPI() {
  try {
    console.log('🔍 Probando API de challenges en http://localhost:5001/api/challenges');
    
    const response = await axios.get('http://localhost:5001/api/challenges');
    
    console.log('✅ Respuesta exitosa');
    console.log('Status:', response.status);
    console.log('Total challenges:', response.data.count);
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('\n📋 Primeros 3 challenges:');
      
      response.data.data.slice(0, 3).forEach((challenge, index) => {
        console.log(`\n--- Challenge ${index + 1} ---`);
        console.log('ID:', challenge.id);
        console.log('Title:', challenge.title);
        console.log('Category (campo principal):', challenge.category);
        console.log('CategoryId:', challenge.categoryId);
        console.log('CategoryName:', challenge.categoryName);
        console.log('CategoryDescription:', challenge.categoryDescription);
        
        // Verificar si category es UUID o nombre descriptivo
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(challenge.category);
        console.log('¿Category es UUID?:', isUUID);
        console.log('Tipo esperado: Nombre descriptivo (no UUID)');
      });
    } else {
      console.log('❌ No se encontraron challenges');
    }
    
  } catch (error) {
    console.error('❌ Error al probar API:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testChallengesAPI();
