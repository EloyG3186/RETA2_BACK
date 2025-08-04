// Controlador de prueba para dashboard sin importaciones complejas

// Obtener datos básicos del dashboard
exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`📊 [TEST] Obteniendo datos del dashboard para usuario: ${userId}`);

    // Datos hardcodeados para prueba
    const dashboardData = {
      stats: {
        challengesWon: 5,
        totalChallenges: 10,
        level: 2
      },
      balance: 750.00,
      activeChallenges: [],
      recentActivity: []
    };

    console.log(`✅ [TEST] Datos del dashboard obtenidos exitosamente`);

    res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('❌ [TEST] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos del dashboard',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardData: exports.getDashboardData
};
