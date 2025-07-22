const { User, UserPoints, Badge, UserBadge } = require('../models');

async function testGamificationDirect() {
  console.log('🧪 Probando funcionalidad de gamificación directamente...\n');
  
  try {
    // 1. Verificar tablas
    console.log('📋 1. Verificando tablas...');
    
    const userPointsCount = await UserPoints.count();
    const badgeCount = await Badge.count();
    const userBadgeCount = await UserBadge.count();
    
    console.log(`   UserPoints: ${userPointsCount} registros`);
    console.log(`   Badges: ${badgeCount} registros`);
    console.log(`   UserBadges: ${userBadgeCount} registros`);
    
    // 2. Obtener primer usuario de prueba
    console.log('\n👤 2. Obteniendo usuario de prueba...');
    const firstUser = await User.findOne();
    
    if (!firstUser) {
      console.log('   ❌ No hay usuarios en la base de datos');
      return;
    }
    
    console.log(`   ✅ Usuario encontrado: ${firstUser.email} (ID: ${firstUser.id})`);
    
    // 3. Probar obtener puntos del usuario
    console.log('\n📊 3. Probando obtención de puntos...');
    let userPoints = await UserPoints.findOne({
      where: { userId: firstUser.id }
    });
    
    if (!userPoints) {
      // Crear puntos para el usuario
      userPoints = await UserPoints.create({
        userId: firstUser.id,
        total: 100,
        level: 2
      });
      console.log('   ✅ Puntos creados para el usuario');
    }
    
    console.log(`   Total: ${userPoints.total}, Nivel: ${userPoints.level}`);
    
    // 4. Probar obtener insignias del usuario
    console.log('\n🏅 4. Probando obtención de insignias...');
    const userBadges = await UserBadge.findAll({
      where: { userId: firstUser.id },
      include: [{ model: Badge }]
    });
    
    console.log(`   Insignias obtenidas: ${userBadges.length}`);
    userBadges.forEach(ub => {
      if (ub.Badge) {
        console.log(`     - ${ub.Badge.name}: ${ub.Badge.description}`);
      }
    });
    
    // 5. Probar tabla de clasificación
    console.log('\n🏆 5. Probando tabla de clasificación...');
    const leaderboard = await UserPoints.findAll({
      include: [{
        model: User,
        attributes: ['id', 'firstName', 'lastName', 'email']
      }],
      order: [['total', 'DESC']],
      limit: 5
    });
    
    console.log('   Top 5:');
    leaderboard.forEach((entry, index) => {
      const user = entry.user || entry.User;
      if (user) {
        console.log(`     ${index + 1}. ${user.firstName} ${user.lastName} - ${entry.total} puntos (Nivel ${entry.level})`);
      } else {
        console.log(`     ${index + 1}. Usuario sin datos - ${entry.total} puntos (Nivel ${entry.level})`);
      }
    });
    
    console.log('\n🎯 Pruebas completadas exitosamente');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
    console.error(error.stack);
  }
}

module.exports = testGamificationDirect;

if (require.main === module) {
  testGamificationDirect()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error general:', error.message);
      process.exit(1);
    });
}
