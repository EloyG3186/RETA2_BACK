const express = require('express');
const cors = require('cors');
const { Sequelize } = require('sequelize');

const app = express();
const PORT = 5001;

// Configuración de base de datos PostgreSQL directa
const sequelize = new Sequelize('challenge_friends_db', 'postgres', 'postgres', {
  host: 'localhost',
  dialect: 'postgresql',
  logging: false
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());

// Endpoint del dashboard con datos hardcodeados para testing
app.get('/api/dashboard', async (req, res) => {
  try {
    console.log('📊 [Dashboard] Solicitud recibida');

    // Obtener datos reales de la base de datos
    const [challenges] = await sequelize.query(`
      SELECT 
        c.id,
        c.title,
        c.description,
        c.entry_fee,
        c.prize,
        c.status,
        c.image_url,
        c.end_date,
        cat.name as category_name
      FROM challenges c
      LEFT JOIN categories cat ON c.category_id = cat.id
      JOIN participants p ON c.id = p.challenge_id
      JOIN users u ON p.user_id = u.id
      WHERE u.username = 'EloyG'
      ORDER BY c.created_at DESC
      LIMIT 10
    `);

    console.log(`🎮 [Dashboard] ${challenges.length} desafíos encontrados`);

    // Formatear desafíos para el frontend
    const formattedChallenges = challenges.map(challenge => ({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description || 'Sin descripción',
      status: challenge.status,
      participants: 2,
      daysLeft: Math.max(0, Math.ceil((new Date(challenge.end_date) - new Date()) / (1000 * 60 * 60 * 24))),
      categoryName: challenge.category_name || 'Sin categoría',
      image: challenge.image_url,
      entryFee: parseFloat(challenge.entry_fee) || 0,
      prize: parseFloat(challenge.prize) || 0,
      amount: parseFloat(challenge.entry_fee) || 0,
      stake: (parseFloat(challenge.entry_fee) || 0).toString()
    }));

    // Obtener balance del wallet
    const [wallets] = await sequelize.query(`
      SELECT balance FROM wallets w
      JOIN users u ON w.user_id = u.id
      WHERE u.username = 'EloyG'
      LIMIT 1
    `);

    const balance = wallets.length > 0 ? parseFloat(wallets[0].balance) || 0 : 0;

    const dashboardData = {
      stats: {
        challengesWon: 0,
        totalChallenges: challenges.length,
        totalActiveChallenges: formattedChallenges.filter(c => ['accepted', 'in_progress', 'judging'].includes(c.status)).length,
        level: 2
      },
      balance: balance,
      allChallenges: formattedChallenges,
      recentActivity: [],
      upcomingEvents: []
    };

    console.log(`💰 [Dashboard] Balance: $${balance}`);
    console.log(`🎯 [Dashboard] Primer desafío stake: $${formattedChallenges[0]?.stake || 'N/A'}`);

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
  res.json({ 
    success: true, 
    message: 'Servidor minimal funcionando', 
    timestamp: new Date(),
    port: PORT
  });
});

// Iniciar servidor
const startMinimalServer = async () => {
  try {
    // Probar conexión a PostgreSQL
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida');
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor minimal ejecutándose en puerto ${PORT}`);
      console.log(`🌐 Dashboard: http://localhost:${PORT}/api/dashboard`);
      console.log(`🧪 Test: http://localhost:${PORT}/api/test`);
      console.log('📊 Listo para recibir peticiones del frontend');
    });
    
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error.message);
    process.exit(1);
  }
};

startMinimalServer();
