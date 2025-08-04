const express = require('express');
const cors = require('cors');
const { sequelize } = require('./src/config/database');
const { User, Challenge, Participant, Wallet, Category } = require('./src/models');
const { Op } = require('sequelize');

const app = express();
const PORT = 5001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());

// Middleware simple de autenticación para testing
const authMiddleware = async (req, res, next) => {
  try {
    // Para testing, usar siempre EloyG
    const user = await User.findOne({ where: { username: 'EloyG' } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Error de autenticación' });
  }
};

// Endpoint del dashboard simplificado
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`📊 [Dashboard] Usuario: ${req.user.username} (${userId})`);

    // Obtener participaciones del usuario
    const userParticipations = await Participant.findAll({
      where: { userId },
      attributes: ['challengeId', 'status', 'createdAt']
    });
    
    console.log(`🎮 [Dashboard] Participaciones: ${userParticipations.length}`);

    let activeChallenges = [];
    
    if (userParticipations.length > 0) {
      const challengeIds = userParticipations.map(p => p.challengeId);
      
      const challenges = await Challenge.findAll({
        where: {
          id: { [Op.in]: challengeIds }
        },
        order: [['createdAt', 'DESC']],
        limit: 10
      });
      
      console.log(`🎮 [Dashboard] Desafíos encontrados: ${challenges.length}`);
      
      // Obtener categorías
      const categoryIds = [...new Set(challenges.map(c => c.categoryId).filter(Boolean))];
      let categories = {};
      
      if (categoryIds.length > 0) {
        const categoryData = await Category.findAll({
          where: { id: { [Op.in]: categoryIds } }
        });
        categories = categoryData.reduce((acc, cat) => {
          acc[cat.id] = cat.name;
          return acc;
        }, {});
      }
      
      // Formatear desafíos
      activeChallenges = challenges.map(challenge => {
        const entryFee = challenge.entryFee || challenge.entry_fee || 0;
        const prize = challenge.prize || 0;
        
        return {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          status: challenge.status,
          participants: 2,
          daysLeft: Math.max(0, Math.ceil((new Date(challenge.endDate) - new Date()) / (1000 * 60 * 60 * 24))),
          category: challenge.categoryId,
          categoryName: categories[challenge.categoryId] || 'Sin categoría',
          image: challenge.imageUrl || challenge.image_url || null,
          entryFee: entryFee,
          prize: prize,
          amount: entryFee,
          stake: entryFee.toString()
        };
      });
      
      console.log(`💰 [Dashboard] Primer desafío stake: ${activeChallenges[0]?.stake || 'N/A'}`);
    }

    // Obtener balance
    const wallet = await Wallet.findOne({ where: { userId } });
    const balance = wallet ? parseFloat(wallet.balance) || 0 : 0;
    
    const dashboardData = {
      stats: {
        challengesWon: 0,
        totalChallenges: userParticipations.length,
        totalActiveChallenges: activeChallenges.filter(c => ['accepted', 'in_progress', 'judging'].includes(c.status)).length,
        level: 1
      },
      balance: balance,
      allChallenges: activeChallenges,
      recentActivity: [],
      upcomingEvents: []
    };

    console.log(`✅ [Dashboard] Enviando ${activeChallenges.length} desafíos, balance: $${balance}`);

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('❌ [Dashboard] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos del dashboard',
      error: error.message
    });
  }
});

// Endpoint de prueba
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Servidor funcionando correctamente', timestamp: new Date() });
});

// Iniciar servidor
const startSimpleServer = async () => {
  try {
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida');
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor simple ejecutándose en puerto ${PORT}`);
      console.log(`🌐 Dashboard disponible en: http://localhost:${PORT}/api/dashboard`);
      console.log(`🧪 Test disponible en: http://localhost:${PORT}/api/test`);
    });
    
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error.message);
    process.exit(1);
  }
};

startSimpleServer();
