const { User, Challenge } = require('../models');
const { Op } = require('sequelize');

/**
 * Obtiene un resumen de la actividad del usuario para un período específico
 * @param {string} userId - ID del usuario
 * @param {string} period - Período ('weekly' o 'monthly')
 * @returns {Promise<Object>} - Datos del resumen
 */
const getUserActivitySummary = async (userId, period) => {
  try {
    // Determinar el rango de fechas según el período
    const today = new Date();
    let startDate;
    
    if (period === 'weekly') {
      // Última semana (7 días atrás)
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
    } else if (period === 'monthly') {
      // Último mes (30 días atrás)
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);
    } else {
      throw new Error('Período no válido. Use "weekly" o "monthly"');
    }
    
    // Buscar desafíos completados en el período
    const completedChallenges = await Challenge.findAll({
      where: {
        [Op.or]: [
          { userId: userId },
          { opponentId: userId }
        ],
        status: 'completed',
        updatedAt: { [Op.between]: [startDate, today] }
      },
      order: [['updatedAt', 'DESC']]
    });
    
    // Buscar nuevos desafíos creados en el período
    const newChallenges = await Challenge.findAll({
      where: {
        [Op.or]: [
          { userId: userId },
          { opponentId: userId }
        ],
        status: { [Op.in]: ['in_progress', 'judging', 'pending'] },
        createdAt: { [Op.between]: [startDate, today] }
      },
      order: [['createdAt', 'DESC']]
    });
    
    // Calcular estadísticas
    let wins = 0;
    let losses = 0;
    let earnings = 0;
    
    completedChallenges.forEach(challenge => {
      // Determinar si el usuario ganó o perdió
      const userIsCreator = challenge.userId === userId;
      const userWon = (userIsCreator && challenge.result === 'creator') || 
                    (!userIsCreator && challenge.result === 'opponent');
      
      if (userWon) {
        wins++;
        earnings += challenge.amount || 0;
      } else if (challenge.result !== 'draw') {
        losses++;
      }
    });
    
    // Calcular tasa de éxito
    const totalCompleted = wins + losses;
    const winRate = totalCompleted > 0 ? Math.round((wins / totalCompleted) * 100) + '%' : '0%';
    
    // Encontrar el día con más actividad
    const activityByDay = {};
    [...completedChallenges, ...newChallenges].forEach(challenge => {
      const date = challenge.updatedAt.toISOString().split('T')[0];
      activityByDay[date] = (activityByDay[date] || 0) + 1;
    });
    
    let mostActiveDay = null;
    let maxActivity = 0;
    
    Object.entries(activityByDay).forEach(([date, count]) => {
      if (count > maxActivity) {
        mostActiveDay = date;
        maxActivity = count;
      }
    });
    
    // Encontrar el desafío con mayor monto ganado
    let biggestWin = null;
    let maxAmount = 0;
    
    completedChallenges.forEach(challenge => {
      const userIsCreator = challenge.userId === userId;
      const userWon = (userIsCreator && challenge.result === 'creator') || 
                    (!userIsCreator && challenge.result === 'opponent');
      
      if (userWon && challenge.amount > maxAmount) {
        biggestWin = challenge;
        maxAmount = challenge.amount;
      }
    });
    
    // Construir y devolver el resumen
    return {
      startDate: startDate.toISOString(),
      endDate: today.toISOString(),
      stats: {
        completedChallenges: completedChallenges.length,
        wins,
        losses,
        winRate,
        earnings
      },
      completedChallenges: completedChallenges.map(c => ({
        id: c.id,
        title: c.title,
        result: (c.userId === userId && c.result === 'creator') || 
                (c.opponentId === userId && c.result === 'opponent') ? 'win' : 
                (c.result === 'draw' ? 'draw' : 'loss'),
        amount: c.amount,
        date: c.updatedAt
      })),
      newChallenges: newChallenges.map(c => ({
        id: c.id,
        title: c.title,
        status: c.status,
        amount: c.amount,
        date: c.createdAt
      })),
      highlights: {
        mostActiveDay,
        biggestWin: biggestWin ? {
          id: biggestWin.id,
          title: biggestWin.title,
          amount: biggestWin.amount
        } : null
      }
    };
  } catch (error) {
    console.error(`Error al obtener resumen de actividad ${period}:`, error);
    throw error;
  }
};

/**
 * Obtiene recomendaciones personalizadas para un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} - Lista de recomendaciones
 */
const getPersonalizedRecommendations = async (userId) => {
  try {
    // Implementación básica de recomendaciones
    // En un sistema real, esto podría usar algoritmos más complejos
    
    // Obtener categorías favoritas del usuario basadas en desafíos anteriores
    const userChallenges = await Challenge.findAll({
      where: {
        [Op.or]: [
          { userId: userId },
          { opponentId: userId }
        ],
        status: 'completed'
      },
      attributes: ['category'],
      order: [['updatedAt', 'DESC']],
      limit: 10
    });
    
    // Contar frecuencia de categorías
    const categoryCounts = {};
    userChallenges.forEach(challenge => {
      if (challenge.category) {
        categoryCounts[challenge.category] = (categoryCounts[challenge.category] || 0) + 1;
      }
    });
    
    // Ordenar categorías por frecuencia
    const favoriteCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
      .slice(0, 3); // Top 3 categorías
    
    // Si no hay categorías favoritas, usar categorías generales
    if (favoriteCategories.length === 0) {
      favoriteCategories.push('fitness', 'learning', 'finance');
    }
    
    // Buscar desafíos populares en esas categorías
    const recommendedChallenges = await Challenge.findAll({
      where: {
        category: { [Op.in]: favoriteCategories },
        status: 'completed',
        // Excluir desafíos donde el usuario ya participó
        [Op.and]: [
          { userId: { [Op.ne]: userId } },
          { opponentId: { [Op.ne]: userId } }
        ]
      },
      order: [['updatedAt', 'DESC']],
      limit: 5
    });
    
    // Formatear recomendaciones
    return recommendedChallenges.map(challenge => ({
      id: challenge.id,
      title: challenge.title,
      category: challenge.category,
      description: challenge.description,
      amount: challenge.amount,
      reason: `Basado en tu interés en ${challenge.category}`
    }));
  } catch (error) {
    console.error('Error al obtener recomendaciones personalizadas:', error);
    throw error;
  }
};

/**
 * Obtiene el ranking de usuarios basado en desafíos completados
 * @param {number} limit - Número máximo de usuarios a devolver
 * @returns {Promise<Array>} - Lista de usuarios con su ranking
 */
const getUserRankings = async (limit = 10) => {
  try {
    // En un sistema real, esto podría ser una consulta más compleja
    // que tenga en cuenta más factores para el ranking
    
    // Obtener todos los usuarios activos
    const users = await User.findAll({
      where: { isActive: true },
      attributes: ['id', 'username', 'fullName']
    });
    
    // Para cada usuario, contar sus desafíos ganados
    const userStats = await Promise.all(users.map(async (user) => {
      const wins = await Challenge.count({
        where: {
          [Op.or]: [
            { userId: user.id, result: 'creator' },
            { opponentId: user.id, result: 'opponent' }
          ],
          status: 'completed'
        }
      });
      
      const totalChallenges = await Challenge.count({
        where: {
          [Op.or]: [
            { userId: user.id },
            { opponentId: user.id }
          ],
          status: 'completed'
        }
      });
      
      return {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        wins,
        totalChallenges,
        winRate: totalChallenges > 0 ? Math.round((wins / totalChallenges) * 100) : 0
      };
    }));
    
    // Ordenar por número de victorias (descendente)
    userStats.sort((a, b) => b.wins - a.wins);
    
    // Devolver solo los primeros 'limit' usuarios
    return userStats.slice(0, limit);
  } catch (error) {
    console.error('Error al obtener ranking de usuarios:', error);
    throw error;
  }
};

module.exports = {
  getUserActivitySummary,
  getPersonalizedRecommendations,
  getUserRankings
};
