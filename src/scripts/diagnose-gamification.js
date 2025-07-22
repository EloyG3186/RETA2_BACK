// Diagnóstico directo de gamificación usando los controladores
console.log('🔍 DIAGNÓSTICO DIRECTO DE GAMIFICACIÓN\n');

async function diagnoseGamification() {
  try {
    // Importar directamente los modelos y controladores
    const { User, UserPoints, Badge, UserBadge } = require('../models');
    const gamificationController = require('../controllers/gamificationController');
    
    console.log('📊 1. Verificando modelos y datos...');
    
    // Contar registros
    const userCount = await User.count();
    const userPointsCount = await UserPoints.count();
    const badgeCount = await Badge.count();
    const userBadgeCount = await UserBadge.count();
    
    console.log(`   Users: ${userCount}`);
    console.log(`   UserPoints: ${userPointsCount}`);
    console.log(`   Badges: ${badgeCount}`);
    console.log(`   UserBadges: ${userBadgeCount}`);
    
    // Obtener usuario de prueba
    const testUser = await User.findOne({
      where: { email: 'test@example.com' }
    });
    
    if (!testUser) {
      console.log('❌ Usuario de prueba no encontrado');
      return;
    }
    
    console.log(`✅ Usuario de prueba encontrado: ${testUser.fullName}`);
    
    // Simular request/response para los controladores
    const mockReq = {
      user: { id: testUser.id },
      query: {}
    };
    
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`\n📦 Respuesta (${code}):`, JSON.stringify(data, null, 2));
          return { status: code, data };
        }
      })
    };
    
    console.log('\n🧪 2. Probando controladores directamente...');
    
    // Test getUserPoints
    console.log('\n📊 getUserPoints:');
    try {
      await gamificationController.getUserPoints(mockReq, mockRes);
    } catch (error) {
      console.log('❌ Error en getUserPoints:', error.message);
    }
    
    // Test getUserBadges
    console.log('\n🏅 getUserBadges:');
    try {
      await gamificationController.getUserBadges(mockReq, mockRes);
    } catch (error) {
      console.log('❌ Error en getUserBadges:', error.message);
    }
    
    // Test getUserRank
    console.log('\n🏆 getUserRank:');
    try {
      await gamificationController.getUserRank(mockReq, mockRes);
    } catch (error) {
      console.log('❌ Error en getUserRank:', error.message);
    }
    
    console.log('\n🎯 Diagnóstico completado');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error.message);
    console.error(error.stack);
  }
}

diagnoseGamification()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error general:', error.message);
    process.exit(1);
  });
