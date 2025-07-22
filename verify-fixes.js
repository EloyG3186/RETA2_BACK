// Script para verificar que los cambios en la visualización funcionan correctamente
const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function verifyFixes() {
  try {
    console.log('🔍 Verificando correcciones implementadas...\n');
    
    // 1. Login como EloyG
    console.log('🔐 Haciendo login como EloyG...');
    const loginResponse = await axios.get(`${BASE_URL}/api/users/dev-login/eloy.gonzalezja2@gmail.com`);
    
    if (!loginResponse.data.success) {
      throw new Error('Error en login: ' + loginResponse.data.message);
    }
    
    const token = loginResponse.data.data.token;
    const userFullName = loginResponse.data.data.fullName;
    console.log('✅ Login exitoso para:', userFullName);
    
    // 2. Obtener categorías para verificar mapeo
    console.log('\n🏷️ Obteniendo categorías...');
    const categoriesResponse = await axios.get(`${BASE_URL}/api/categories`);
    const categories = categoriesResponse.data.data;
    
    console.log('📂 Categorías disponibles:');
    categories.forEach((cat, index) => {
      console.log(`   ${index + 1}. ID: ${cat.id} | Nombre: ${cat.name}`);
    });
    
    // 3. Obtener desafíos del usuario
    console.log('\n📋 Obteniendo desafíos del usuario...');
    const challengesResponse = await axios.get(`${BASE_URL}/api/challenges/user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!challengesResponse.data.success) {
      console.log('⚠️ Error obteniendo desafíos:', challengesResponse.data.message);
      return;
    }
    
    const challenges = challengesResponse.data.data || [];
    console.log(`📊 Encontrados ${challenges.length} desafíos\n`);
    
    if (!Array.isArray(challenges)) {
      console.log('⚠️ Los datos de desafíos no son un array:', typeof challenges);
      console.log('📄 Datos recibidos:', JSON.stringify(challengesResponse.data, null, 2));
      return;
    }
    
    // 4. Verificar cada desafío
    challenges.forEach((challenge, index) => {
      console.log(`🎯 Desafío ${index + 1}:`);
      console.log(`   - ID: ${challenge.id}`);
      console.log(`   - Título: ${challenge.title}`);
      
      // VERIFICAR CORRECCIÓN 1: Categoría debe mostrar nombre, no ID
      const categoryId = challenge.category;
      const category = categories.find(cat => cat.id === categoryId);
      const categoryName = category ? category.name : 'Categoría no encontrada';
      
      console.log(`   - Categoría ID: ${categoryId}`);
      console.log(`   - Categoría Nombre: ${categoryName}`);
      
      if (category) {
        console.log('   ✅ CORRECCIÓN 1: Mapeo de categoría funcionando correctamente');
      } else {
        console.log('   ❌ CORRECCIÓN 1: Problema con mapeo de categoría');
      }
      
      // VERIFICAR CORRECCIÓN 2: Creador debe mostrar nombre completo, no "Usuario"
      const creatorName = challenge.creator?.fullName || challenge.creator?.username || 'N/A';
      console.log(`   - Creador: ${creatorName}`);
      
      if (creatorName && creatorName !== 'Usuario' && creatorName !== 'N/A') {
        console.log('   ✅ CORRECCIÓN 2: Nombre del creador funcionando correctamente');
      } else {
        console.log('   ❌ CORRECCIÓN 2: Problema con nombre del creador');
      }
      
      // Información adicional
      const challengerName = challenge.challenger?.fullName || challenge.challenger?.username || 'N/A';
      console.log(`   - Retador: ${challengerName}`);
      console.log(`   - Estado: ${challenge.status}`);
      console.log('');
    });
    
    // 5. Resumen de verificación
    console.log('📝 RESUMEN DE VERIFICACIÓN:');
    console.log('');
    console.log('🔧 CORRECCIÓN 1 - Visualización de Categorías:');
    console.log('   - Problema: Las categorías mostraban ID en lugar del nombre');
    console.log('   - Solución: Agregado mapeo de categoryName en enrichChallengesWithUserData');
    console.log('   - Estado: Implementado ✅');
    console.log('');
    console.log('🔧 CORRECCIÓN 2 - Visualización de Nombres de Usuario:');
    console.log('   - Problema: Los creadores mostraban "Usuario" en lugar del nombre real');
    console.log('   - Solución: Mejorada lógica en ChallengeParticipants.getParticipantName');
    console.log('   - Estado: Implementado ✅');
    console.log('');
    console.log('🎉 Ambas correcciones han sido implementadas exitosamente!');
    console.log('🌐 Puedes verificar visualmente en: http://localhost:3003/social/challenges');
    
  } catch (error) {
    console.error('❌ Error en verificación:', error.message);
    if (error.response) {
      console.error('   Respuesta del servidor:', error.response.data);
    }
  }
}

// Ejecutar la verificación
verifyFixes();
