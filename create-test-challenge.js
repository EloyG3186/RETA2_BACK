// Script para crear un desafío de prueba y verificar la visualización
const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function createTestChallenge() {
  try {
    console.log('🧪 Creando desafío de prueba...');
    
    // 1. Login como EloyG
    console.log('🔐 Haciendo login como EloyG...');
    const loginResponse = await axios.get(`${BASE_URL}/api/users/dev-login/eloy.gonzalezja2@gmail.com`);
    
    if (!loginResponse.data.success) {
      throw new Error('Error en login: ' + loginResponse.data.message);
    }
    
    const token = loginResponse.data.data.token;
    const userId = loginResponse.data.data.id;
    console.log('✅ Login exitoso para usuario:', loginResponse.data.data.fullName);
    
    // 2. Obtener categorías
    console.log('🏷️ Obteniendo categorías...');
    const categoriesResponse = await axios.get(`${BASE_URL}/api/categories`);
    const categories = categoriesResponse.data.data;
    console.log(`📂 Encontradas ${categories.length} categorías`);
    
    // 3. Obtener amigos para usar como retador
    console.log('👥 Obteniendo amigos...');
    const friendsResponse = await axios.get(`${BASE_URL}/api/users/friends`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    let challengerId = null;
    if (friendsResponse.data.success && friendsResponse.data.data.length > 0) {
      challengerId = friendsResponse.data.data[0].id;
      console.log('👤 Usando amigo como retador:', friendsResponse.data.data[0].fullName);
    } else {
      // Si no hay amigos, usar Gonza25
      const gonza25Response = await axios.get(`${BASE_URL}/api/users/debug-user/eloy.gonzalezja@gmail.com`);
      if (gonza25Response.data.success) {
        challengerId = gonza25Response.data.data.id;
        console.log('👤 Usando Gonza25 como retador');
      }
    }
    
    if (!challengerId) {
      throw new Error('No se pudo encontrar un retador válido');
    }
    
    // 4. Crear el desafío
    const challengeData = {
      title: 'Desafío de Prueba - Visualización',
      description: 'Este es un desafío creado para probar la visualización correcta de categorías y nombres de usuario.',
      category: categories[0].id, // Usar la primera categoría
      sport: 'Fútbol',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días después
      stake: '50.00',
      entryFee: '10.00',
      prize: '100.00',
      challengerId: challengerId,
      rules: 'Reglas del desafío de prueba'
    };
    
    console.log('🎯 Creando desafío con datos:', {
      title: challengeData.title,
      category: challengeData.category,
      categoryName: categories[0].name,
      challengerId: challengeData.challengerId
    });
    
    const createResponse = await axios.post(`${BASE_URL}/api/challenges`, challengeData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!createResponse.data.success) {
      throw new Error('Error creando desafío: ' + createResponse.data.message);
    }
    
    console.log('✅ Desafío creado exitosamente!');
    console.log('🆔 ID del desafío:', createResponse.data.data.id);
    
    // 5. Verificar que el desafío se creó correctamente
    console.log('🔍 Verificando desafío creado...');
    const challengesResponse = await axios.get(`${BASE_URL}/api/challenges/user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (challengesResponse.data.success) {
      const challenges = challengesResponse.data.data;
      const createdChallenge = challenges.find(c => c.id === createResponse.data.data.id);
      
      if (createdChallenge) {
        console.log('📊 Desafío encontrado:');
        console.log(`   - Título: ${createdChallenge.title}`);
        console.log(`   - Categoría ID: ${createdChallenge.category}`);
        console.log(`   - Creador: ${createdChallenge.creator?.fullName || createdChallenge.creator?.username || 'N/A'}`);
        console.log(`   - Retador: ${createdChallenge.challenger?.fullName || createdChallenge.challenger?.username || 'N/A'}`);
        console.log(`   - Estado: ${createdChallenge.status}`);
      }
    }
    
    console.log('\n🎉 ¡Desafío de prueba creado exitosamente!');
    console.log('🌐 Ahora puedes ir a http://localhost:3003/social/challenges para ver el resultado');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Respuesta del servidor:', error.response.data);
    }
  }
}

// Ejecutar la función
createTestChallenge();
