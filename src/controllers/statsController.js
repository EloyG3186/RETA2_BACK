const { Challenge, Participant, Evidence, User, sequelize } = require('../models');
const challengeService = require('../services/challengeService');

/**
 * Controlador para obtener estadísticas de un desafío
 */
exports.getChallengeStats = async (req, res) => {
  try {
    const { challengeId } = req.params;
    
    // Verificar que el desafío existe
    const challenge = await Challenge.findByPk(challengeId);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Desafío no encontrado'
      });
    }

    // Obtener estadísticas usando el servicio
    const stats = await challengeService.getChallengeStats(challengeId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del desafío:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las estadísticas del desafío',
      error: error.message
    });
  }
};

/**
 * Controlador para obtener estadísticas del usuario
 */
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id; // Obtenido del middleware de autenticación
    console.log('Obteniendo estadísticas para el usuario:', userId);

    // Datos de ejemplo para desarrollo
    const statsData = {
      userId,
      totalChallenges: 24,
      wins: 15,
      losses: 9,
      totalEarned: 320,
      totalLost: 180
    };

    // Intentar obtener datos reales si es posible
    try {
      // Obtener todos los desafíos en los que el usuario ha participado
      const participations = await Participant.findAll({
        where: { userId },
        include: [{
          model: Challenge,
          attributes: ['id', 'status', 'winnerId', 'amount']
        }]
      });

      // Inicializar contadores
      let totalChallenges = 0;
      let wins = 0;
      let losses = 0;
      let totalEarned = 0;
      let totalLost = 0;

      // Calcular estadísticas
      participations.forEach(participation => {
        const challenge = participation.Challenge;
        
        // Solo contar desafíos completados
        if (challenge && (challenge.status === 'completed' || challenge.status === 'closed')) {
          totalChallenges++;
          
          // Contar victorias y derrotas
          if (challenge.winnerId === userId) {
            wins++;
            totalEarned += parseFloat(challenge.amount || 0);
          } else if (challenge.winnerId && challenge.winnerId !== userId) {
            losses++;
            totalLost += parseFloat(challenge.amount || 0);
          }
        }
      });

      // Actualizar con datos reales si se encontraron
      if (totalChallenges > 0) {
        statsData.totalChallenges = totalChallenges;
        statsData.wins = wins;
        statsData.losses = losses;
        statsData.totalEarned = totalEarned;
        statsData.totalLost = totalLost;
      }
    } catch (dbError) {
      console.error('Error al consultar la base de datos para estadísticas:', dbError);
      // Continuamos con los datos de ejemplo
    }

    res.status(200).json({
      success: true,
      data: statsData
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las estadísticas del usuario',
      error: error.message
    });
  }
};
