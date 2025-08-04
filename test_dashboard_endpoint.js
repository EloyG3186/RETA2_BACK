const { sequelize } = require('./src/config/database');
const { User, Challenge, Participant, Wallet, Category } = require('./src/models');
const { Op } = require('sequelize');

async function testDashboardEndpoint() {
  try {
    console.log('🧪 Probando lógica del endpoint dashboard...\n');
    
    // Simular usuario EloyG
    const user = await User.findOne({ where: { username: 'EloyG' } });
    if (!user) {
      console.log('❌ Usuario EloyG no encontrado');
      return;
    }
    
    const userId = user.id;
    console.log(`👤 Usuario: ${user.username} (${userId})`);
    
    // Obtener participaciones del usuario
    const userParticipations = await Participant.findAll({
      where: { userId },
      attributes: ['challengeId', 'status', 'createdAt']
    });
    
    console.log(`🎮 Participaciones encontradas: ${userParticipations.length}`);
    
    if (userParticipations.length > 0) {
      // Obtener los IDs de los desafíos
      const challengeIds = userParticipations.map(p => p.challengeId);
      
      // Obtener desafíos del usuario
      const challenges = await Challenge.findAll({
        where: {
          id: {
            [Op.in]: challengeIds
          }
        },
        order: [['createdAt', 'DESC']],
        limit: 5 // Solo los primeros 5 para testing
      });
      
      console.log(`🎮 Desafíos encontrados: ${challenges.length}`);
      
      // Obtener categorías
      const categoryIds = [...new Set(challenges.map(c => c.categoryId).filter(Boolean))];
      let categories = {};
      
      if (categoryIds.length > 0) {
        const categoryData = await Category.findAll({
          where: {
            id: {
              [Op.in]: categoryIds
            }
          }
        });
        
        categories = categoryData.reduce((acc, cat) => {
          acc[cat.id] = cat.name;
          return acc;
        }, {});
      }
      
      // Formatear los desafíos como lo hace el controlador
      const activeChallenges = challenges.map(challenge => ({
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        status: challenge.status,
        participants: 1,
        daysLeft: Math.max(0, Math.ceil((new Date(challenge.endDate) - new Date()) / (1000 * 60 * 60 * 24))),
        category: challenge.categoryId,
        categoryName: categories[challenge.categoryId] || 'Sin categoría',
        image: challenge.imageUrl || challenge.image_url || null,
        // Campos de apuesta
        entryFee: challenge.entryFee || challenge.entry_fee || 0,
        prize: challenge.prize || 0,
        amount: challenge.entryFee || challenge.entry_fee || 0,
        stake: (challenge.entryFee || challenge.entry_fee || 0).toString()
      }));
      
      console.log('\n📊 Desafíos formateados para frontend:');
      activeChallenges.forEach((challenge, index) => {
        console.log(`${index + 1}. "${challenge.title}"`);
        console.log(`   💰 Entry Fee: $${challenge.entryFee} | Prize: $${challenge.prize}`);
        console.log(`   📷 Image: ${challenge.image || 'Sin imagen'}`);
        console.log(`   📊 Status: ${challenge.status}`);
        console.log(`   🎯 Stake (string): "${challenge.stake}"`);
        console.log(`   🎯 Amount: ${challenge.amount}`);
        console.log('');
      });
    }
    
    // Obtener balance del wallet
    const wallet = await Wallet.findOne({ where: { userId } });
    const balance = wallet ? parseFloat(wallet.balance) || 0 : 0;
    
    console.log(`💰 Balance del wallet: $${balance}`);
    
    // Crear respuesta simulada del dashboard
    const dashboardData = {
      stats: {
        challengesWon: 0,
        totalChallenges: userParticipations.length,
        level: 1
      },
      balance: balance,
      allChallenges: userParticipations.length > 0 ? activeChallenges : [],
      recentActivity: [],
      upcomingEvents: []
    };
    
    console.log('\n🎯 Respuesta simulada del dashboard:');
    console.log('- Total challenges:', dashboardData.stats.totalChallenges);
    console.log('- Balance:', dashboardData.balance);
    console.log('- Challenges con valores:', dashboardData.allChallenges.length);
    console.log('- Primer challenge stake:', dashboardData.allChallenges[0]?.stake || 'N/A');
    
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
  }
}

testDashboardEndpoint();
