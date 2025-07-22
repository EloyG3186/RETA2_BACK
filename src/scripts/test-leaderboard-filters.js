const axios = require('axios');

// Script para probar las mejoras del leaderboard
async function testLeaderboardImprovements() {
  try {
    console.log('🧪 Probando mejoras del leaderboard...\n');
    
    // Test 1: Verificar que solo se muestran usuarios con rol 'user'
    console.log('1️⃣ Test: Filtrar solo usuarios con rol "user"');
    const response = await axios.get('http://localhost:5001/api/gamification/leaderboard?limit=20');
    
    if (response.data && Array.isArray(response.data)) {
      console.log(`✅ Leaderboard recibido con ${response.data.length} usuarios`);
      
      // Verificar que no hay administradores
      const adminUsers = response.data.filter(user => 
        user.username.toLowerCase().includes('admin') || 
        user.fullName.toLowerCase().includes('admin')
      );
      
      if (adminUsers.length === 0) {
        console.log('✅ Sin administradores en el leaderboard');
      } else {
        console.log('❌ Administradores encontrados:', adminUsers.map(u => u.username));
      }
      
      // Test 2: Verificar estructura de datos
      console.log('\n2️⃣ Test: Estructura de datos');
      const sampleUser = response.data[0];
      if (sampleUser) {
        console.log('✅ Usuario de ejemplo:', {
          userId: sampleUser.userId,
          username: sampleUser.username,
          fullName: sampleUser.fullName,
          profilePicture: sampleUser.profilePicture,
          points: sampleUser.points,
          level: sampleUser.level,
          rank: sampleUser.rank
        });
        
        // Verificar que todos los campos necesarios están presentes
        const requiredFields = ['userId', 'username', 'points', 'level', 'rank'];
        const missingFields = requiredFields.filter(field => !sampleUser.hasOwnProperty(field));
        
        if (missingFields.length === 0) {
          console.log('✅ Todos los campos requeridos están presentes');
        } else {
          console.log('❌ Campos faltantes:', missingFields);
        }
      }
      
      // Test 3: Verificar diferentes niveles
      console.log('\n3️⃣ Test: Diversidad de niveles');
      const levels = [...new Set(response.data.map(user => user.level))].sort();
      console.log('✅ Niveles encontrados:', levels);
      
      // Test 4: Verificar ranking correcto
      console.log('\n4️⃣ Test: Orden de ranking');
      let rankingCorrect = true;
      for (let i = 0; i < response.data.length - 1; i++) {
        if (response.data[i].points < response.data[i + 1].points) {
          rankingCorrect = false;
          break;
        }
      }
      
      if (rankingCorrect) {
        console.log('✅ Ranking ordenado correctamente por puntos');
      } else {
        console.log('❌ Problema en el orden del ranking');
      }
      
    } else {
      console.log('❌ Respuesta inválida del API');
    }
    
  } catch (error) {
    console.error('❌ Error al probar el leaderboard:', error.message);
    if (error.response) {
      console.error('Código de estado:', error.response.status);
      console.error('Datos del error:', error.response.data);
    }
  }
}

// Ejecutar las pruebas
testLeaderboardImprovements();
