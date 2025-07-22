// Arreglo directo para controladores de gamificación
const { User, UserPoints, Badge, UserBadge } = require('../models');

async function fixControllers() {
  console.log('🔧 Probando queries directas para gamificación...\n');
  
  // Usuario de prueba
  const testUserId = '11111111-1111-1111-1111-111111111111';
  
  try {
    console.log('👤 1. Verificando usuario de prueba...');
    const user = await User.findByPk(testUserId);
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    console.log(`✅ Usuario: ${user.fullName}`);
    
    console.log('\n📊 2. Probando getUserPoints (query directa)...');
    const userPoints = await UserPoints.findOne({
      where: { userId: testUserId }
    });
    
    if (userPoints) {
      const pointsData = {
        total: userPoints.total,
        level: userPoints.level,
        nextLevelPoints: (userPoints.level + 1) * 100,
        progress: userPoints.total % 100
      };
      console.log('✅ Points:', JSON.stringify(pointsData, null, 2));
    } else {
      console.log('❌ No se encontraron puntos para el usuario');
    }
    
    console.log('\n🏅 3. Probando getUserBadges (query directa)...');
    const userBadges = await UserBadge.findAll({
      where: { userId: testUserId },
      raw: true
    });
    
    console.log(`✅ UserBadges encontrados: ${userBadges.length}`);
    
    if (userBadges.length > 0) {
      // Obtener detalles de badges por separado
      const badgeIds = userBadges.map(ub => ub.badgeId);
      const badges = await Badge.findAll({
        where: { id: badgeIds },
        raw: true
      });
      
      const badgesData = userBadges.map(userBadge => {
        const badge = badges.find(b => b.id === userBadge.badgeId);
        return {
          id: badge?.id,
          name: badge?.name,
          description: badge?.description,
          icon: badge?.icon,
          dateEarned: userBadge.dateEarned
        };
      });
      
      console.log('✅ Badges:', JSON.stringify(badgesData, null, 2));
    }
    
    console.log('\n🏆 4. Probando getUserRank (query simplificada)...');
    const totalUsers = await UserPoints.count();
    const usersWithMorePoints = await UserPoints.count({
      where: {
        total: {
          [require('sequelize').Op.gt]: userPoints?.total || 0
        }
      }
    });
    
    const rank = usersWithMorePoints + 1;
    const rankData = {
      rank: rank,
      totalUsers: totalUsers,
      percentage: Math.round(((totalUsers - rank + 1) / totalUsers) * 100)
    };
    
    console.log('✅ Rank:', JSON.stringify(rankData, null, 2));
    
    console.log('\n🎯 Todas las queries funcionan correctamente');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

fixControllers()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error general:', error.message);
    process.exit(1);
  });
