const { User, UserPoints, Badge, UserBadge, sequelize } = require('../models');
const { Op } = require('sequelize');

async function testLeaderboardEndpoint() {
  try {
    console.log('🏆 Probando endpoint de leaderboard...\n');

    // 1. Verificar que hay datos en UserPoints
    console.log('📊 1. Verificando datos en UserPoints:');
    const userPointsCount = await UserPoints.count();
    console.log(`   Total de registros en UserPoints: ${userPointsCount}`);
    
    if (userPointsCount === 0) {
      console.log('⚠️  No hay registros en UserPoints. Creando datos de prueba...');
      
      // Obtener algunos usuarios
      const users = await User.findAll({ limit: 5 });
      console.log(`   Usuarios encontrados: ${users.length}`);
      
      if (users.length > 0) {
        // Crear puntos para estos usuarios
        for (let i = 0; i < users.length; i++) {
          const user = users[i];
          const points = Math.floor(Math.random() * 1000) + 100; // Entre 100 y 1100 puntos
          const level = Math.floor(points / 100) + 1;
          
          await UserPoints.create({
            userId: user.id,
            total: points,
            level: level
          });
          
          console.log(`   ✅ Puntos creados para ${user.fullName}: ${points} pts (Nivel ${level})`);
        }
      } else {
        console.log('❌ No hay usuarios en la base de datos');
        return;
      }
    }

    // 2. Simular la query del controlador getLeaderboard
    console.log('\n🔍 2. Simulando query del controlador getLeaderboard:');
    
    const limit = 10;
    
    // Obtener usuarios con sus puntos, ordenados por total de puntos
    const leaderboard = await UserPoints.findAll({
      include: [{
        model: User,
        attributes: ['id', 'username', 'fullName', 'profilePicture']
      }],
      order: [['total', 'DESC']],
      limit
    });
    
    console.log(`   Registros encontrados: ${leaderboard.length}`);
    
    // Contar insignias por usuario usando la misma estrategia que el controlador
    const userIds = leaderboard.map(entry => entry.userId);
    const badgeCounts = await UserBadge.findAll({
      attributes: [
        'userId',
        [sequelize.fn('COUNT', sequelize.col('userId')), 'badgeCount']
      ],
      where: { userId: { [Op.in]: userIds } },
      group: ['userId']
    });
    
    const badgeCountMap = {};
    badgeCounts.forEach(count => {
      badgeCountMap[count.userId] = parseInt(count.getDataValue('badgeCount'));
    });
    
    console.log(`   Badge counts calculados para ${Object.keys(badgeCountMap).length} usuarios`);
    
    // Formatear leaderboard como lo hace el controlador
    const formattedLeaderboard = leaderboard.map((entry, index) => ({
      userId: entry.userId.toString(),
      username: entry.User.username,
      fullName: entry.User.fullName,
      profilePicture: entry.User.profilePicture,
      points: entry.total,
      level: entry.level,
      rank: index + 1,
      badgeCount: badgeCountMap[entry.userId] || 0
    }));
    
    // 3. Mostrar resultado
    console.log('\n📋 3. Resultado del leaderboard:');
    console.log(JSON.stringify(formattedLeaderboard, null, 2));
    
    // 4. Verificar que es un array válido
    console.log('\n✅ 4. Verificaciones:');
    console.log(`   ¿Es un array? ${Array.isArray(formattedLeaderboard)}`);
    console.log(`   Longitud: ${formattedLeaderboard.length}`);
    console.log(`   ¿Puede usar .map()? ${typeof formattedLeaderboard.map === 'function'}`);
    
    if (formattedLeaderboard.length > 0) {
      console.log('   ✅ Leaderboard válido con datos');
    } else {
      console.log('   ⚠️  Leaderboard vacío pero válido');
    }
    
    console.log('\n🎯 Prueba del endpoint de leaderboard completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en la prueba del leaderboard:', error);
    console.error(error.stack);
  }
}

if (require.main === module) {
  testLeaderboardEndpoint().then(() => process.exit(0));
}

module.exports = testLeaderboardEndpoint;
