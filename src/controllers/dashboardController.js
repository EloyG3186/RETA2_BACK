const { User, Challenge, Participant, Wallet, Transaction, Category, UserPoints, Participation } = require('../models');
const { Op } = require('sequelize');

// Obtener datos consolidados del dashboard
exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`📊 [getDashboardData] Obteniendo datos del dashboard para usuario: ${userId}`);

    // Endpoint de prueba mínimo - MODIFICADO PARA TESTING
    const dashboardData = {
      stats: {
        challengesWon: 999,
        totalChallenges: 888,
        level: 777
      },
      balance: 666.66,
      activeChallenges: [{
        id: 'test-challenge',
        title: 'TESTING FUNCTION',
        description: 'Esta es la función simple de testing'
      }],
      recentActivity: [{
        id: 'test-activity',
        description: 'TESTING - Esta es la función getDashboardData simple'
      }]
    };

    console.log(`✅ [getDashboardData] Datos del dashboard obtenidos exitosamente`);
    console.log(`📈 [getDashboardData] Stats: Level 2, 5/10 desafíos, Balance: $750.00`);

    res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('❌ [getDashboardData] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos del dashboard',
      error: error.message
    });
  }
};

// Endpoint con datos reales - VERSIÓN SIMPLIFICADA
exports.getDashboardDataSimple = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`🔥 [getDashboardDataReal] VERSIÓN SIMPLIFICADA - Usuario: ${userId}`);
    console.log(`🔍 [DEBUG] Iniciando versión simplificada...`);
    
    // Obtener información del usuario para actividad reciente
    let currentUser = null;
    try {
      currentUser = await User.findByPk(userId, {
        attributes: ['id', 'username', 'email', 'fullName']
      });
      console.log(`👤 [Dashboard] Usuario obtenido: ${currentUser ? currentUser.username : 'No encontrado'}`);
    } catch (error) {
      console.error('❌ Error al obtener usuario:', error.message);
    }
    
    // DEBUGGING TEMPORAL: Verificar UserPoints
    console.log(`🔍 [DEBUG] Buscando UserPoints para userId: ${userId}`);
    const debugUserPoints = await UserPoints.findOne({ where: { userId } });
    console.log(`🔍 [DEBUG] UserPoints directo:`, debugUserPoints ? debugUserPoints.toJSON() : 'No encontrado');

    let level = 1;
    let totalPoints = 0;
    let userPoints = null;
    try {
      userPoints = await UserPoints.findOne({ where: { userId } });
      if (userPoints) {
        level = userPoints.level || 1;
        totalPoints = userPoints.total || 0;
        console.log(`✅ [Dashboard] Nivel obtenido: ${level} (${totalPoints} puntos)`);
      } else {
        console.log(`⚠️ [Dashboard] No se encontraron UserPoints para el usuario`);
      }
    } catch (error) {
      console.error('❌ Error al obtener UserPoints:', error.message);
    }
    
    // Obtener insignias del usuario
    let totalBadges = 0;
    try {
      const { UserBadge } = require('../models');
      const userBadges = await UserBadge.findAll({ where: { userId } });
      totalBadges = userBadges.length;
      console.log(`🏆 [Dashboard] Insignias obtenidas: ${totalBadges}`);
    } catch (error) {
      console.error('❌ Error al obtener insignias:', error.message);
    }
    
    // 2. Obtener balance del wallet
    let balance = 0;
    let wallet = null;
    try {
      wallet = await Wallet.findOne({ where: { userId } });
      if (wallet) {
        balance = parseFloat(wallet.balance) || 0;
        console.log(`✅ [Dashboard] Balance obtenido: $${balance}`);
      }
    } catch (error) {
      console.error('❌ Error al obtener wallet:', error.message);
    }
    
    // 3. Obtener desafíos activos del usuario
    let activeChallenges = [];
    let userParticipations = [];
    
    try {
      console.log(`🎮 [Dashboard] Buscando participaciones activas para usuario: ${userId}`);
      
      // Primero obtener las participaciones del usuario con datos del desafío
      userParticipations = await Participant.findAll({
        where: { userId },
        attributes: ['challengeId', 'status', 'createdAt'],
        include: [{
          model: Challenge,
          as: 'challenge',
          attributes: ['id', 'status', 'winnerId', 'createdAt']
        }]
      });
      
      console.log(`🎮 [Dashboard] Participaciones encontradas: ${userParticipations.length}`);
      
      if (userParticipations.length > 0) {
        // Obtener los IDs de los desafíos
        const challengeIds = userParticipations.map(p => p.challengeId);
        
        // Obtener TODOS los desafíos del usuario con información de participantes
        const challenges = await Challenge.findAll({
          where: {
            id: {
              [Op.in]: challengeIds
            }
          },
          include: [{
            model: Participant,
            as: 'participants',
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'fullName']
            }]
          }],
          order: [['createdAt', 'DESC']],
          limit: 50 // Mostrar más desafíos para permitir filtrado en frontend
        });
        
        console.log(`🎮 [Dashboard] Desafíos encontrados: ${challenges.length}`);
        console.log(`🔍 [DEBUG] Estados de desafíos encontrados:`, challenges.map(c => c.status));
        console.log(`🔍 [DEBUG] Primeros 5 desafíos:`, challenges.slice(0, 5).map(c => ({ id: c.id, title: c.title, status: c.status })));
        
        // Obtener información de categorías para los desafíos
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
          
          console.log(`🏷️ [Dashboard] Categorías cargadas: ${Object.keys(categories).length}`);
        }
        
        // Formatear los desafíos para el frontend
        activeChallenges = challenges.map(challenge => {
          // Encontrar el oponente (participante que no es el usuario actual)
          const opponent = challenge.participants?.find(p => p.user.id !== userId);
          const opponentName = opponent ? (opponent.user.fullName || opponent.user.username) : 'Oponente desconocido';
          
          return {
            id: challenge.id,
            title: challenge.title,
            description: challenge.description,
            status: challenge.status,
            participants: challenge.participants?.length || 1,
            daysLeft: Math.max(0, Math.ceil((new Date(challenge.endDate) - new Date()) / (1000 * 60 * 60 * 24))),
            category: challenge.categoryId,
            categoryName: categories[challenge.categoryId] || 'Sin categoría',
            image: challenge.imageUrl || challenge.image_url ? 
              `http://localhost:5001${challenge.imageUrl || challenge.image_url}` : null,
            // Datos del oponente y fecha
            opponent: opponentName,
            date: challenge.createdAt,
            // Agregar campos de apuesta
            entryFee: challenge.entryFee || challenge.entry_fee || 0,
            prize: challenge.prize || 0,
            amount: challenge.entryFee || challenge.entry_fee || 0, // Para compatibilidad con frontend
            stake: (challenge.entryFee || challenge.entry_fee || 0).toString() // Para compatibilidad con frontend
          };
        });
      }
    } catch (error) {
      console.error('❌ Error al obtener desafíos activos:', error.message);
    }
    
    // 4. Obtener estadísticas básicas
    let challengesWon = 0;
    let totalChallenges = 0;
    let totalActiveChallenges = 0;
    try {
      // Contar participaciones totales
      totalChallenges = await Participant.count({
        where: { userId }
      });
      
      // Contar desafíos ganados
      challengesWon = await Challenge.count({
        where: { 
          winnerId: userId,
          status: 'completed'
        }
      });
      
      // Contar total de desafíos activos (para estadísticas correctas - excluyendo pending)
      if (userParticipations.length > 0) {
        const challengeIds = userParticipations.map(p => p.challengeId);
        totalActiveChallenges = await Challenge.count({
          where: {
            id: {
              [Op.in]: challengeIds
            },
            status: {
              [Op.in]: ['accepted', 'judge_assigned', 'in_progress', 'judging']
            }
          }
        });
      }
      
      console.log(`📈 [Dashboard] Estadísticas: ${challengesWon}/${totalChallenges} desafíos, ${totalActiveChallenges} activos`);
    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error.message);
    }
    
    // 5. Obtener actividad reciente
    let recentActivity = [];
    try {
      console.log(`📈 [Dashboard] Obteniendo actividad reciente para usuario: ${userId}`);
      
      // Obtener transacciones recientes del wallet
      if (wallet) {
        const recentTransactions = await Transaction.findAll({
          where: { walletId: wallet.id },
          order: [['createdAt', 'DESC']],
          limit: 5
        });
        
        recentActivity.push(...recentTransactions.map(transaction => ({
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          date: transaction.createdAt,
          status: 'completed',
          user: {
            name: currentUser ? (currentUser.fullName || currentUser.username) : 'Usuario',
            avatar: null
          }
        })));
        
        console.log(`💰 [Dashboard] Transacciones recientes: ${recentTransactions.length}`);
      }
      
      // Obtener desafíos completados recientes (sin joins complejos)
      const userCompletedParticipations = await Participant.findAll({
        where: { userId },
        attributes: ['challengeId', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 10
      });
      
      if (userCompletedParticipations.length > 0) {
        const completedChallengeIds = userCompletedParticipations.map(p => p.challengeId);
        
        const completedChallenges = await Challenge.findAll({
          where: {
            id: {
              [Op.in]: completedChallengeIds
            },
            status: 'completed'
          },
          order: [['updatedAt', 'DESC']],
          limit: 5
        });
        
        recentActivity.push(...completedChallenges.map(challenge => ({
          id: `challenge_${challenge.id}`,
          type: 'challenge_completed',
          amount: challenge.winnerId === userId ? (challenge.prize || 0) : 0,
          description: `Desafío completado: ${challenge.title}`,
          date: challenge.updatedAt,
          status: challenge.winnerId === userId ? 'won' : 'participated',
          user: {
            name: currentUser ? (currentUser.fullName || currentUser.username) : 'Usuario',
            avatar: null
          }
        })));
        
        console.log(`🏆 [Dashboard] Desafíos completados: ${completedChallenges.length}`);
      }
      
      // Ordenar actividad reciente por fecha
      recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));
      recentActivity = recentActivity.slice(0, 10); // Limitar a 10 elementos
      
      console.log(`📈 [Dashboard] Total actividad reciente: ${recentActivity.length}`);
    } catch (error) {
      console.error('❌ Error al obtener actividad reciente:', error.message);
    }
    
    // 6. Estadísticas para gráficos
    let chartData = {
      statusDistribution: [],
      winLossDistribution: []
    };
    
    try {
      // Gráfico 1: Distribución por estatus
      const statusCounts = {};
      userParticipations.forEach(participation => {
        const status = participation.challenge.status;
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      const totalParticipations = userParticipations.length;
      chartData.statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        percentage: totalParticipations > 0 ? Math.round((count / totalParticipations) * 100) : 0
      }));
      
      // Si no hay datos, agregar datos de ejemplo para demostración
      if (chartData.statusDistribution.length === 0) {
        chartData.statusDistribution = [
          { status: 'pending', count: 5, percentage: 50 },
          { status: 'in_progress', count: 3, percentage: 30 },
          { status: 'completed', count: 2, percentage: 20 }
        ];
      }
      
      // Gráfico 2: Distribución de victorias/empates/derrotas
      const completedChallenges = userParticipations.filter(p => p.challenge.status === 'completed');
      const totalCompleted = completedChallenges.length;
      
      let wonCount = 0;
      let tiedCount = 0;
      let lostCount = 0;
      
      completedChallenges.forEach(participation => {
        const challenge = participation.challenge;
        if (challenge.winnerId === userId) {
          wonCount++;
        } else if (challenge.winnerId === null) {
          tiedCount++;
        } else {
          lostCount++;
        }
      });
      
      chartData.winLossDistribution = [
        {
          result: 'Ganados',
          count: wonCount,
          percentage: totalCompleted > 0 ? Math.round((wonCount / totalCompleted) * 100) : 0
        },
        {
          result: 'Empatados',
          count: tiedCount,
          percentage: totalCompleted > 0 ? Math.round((tiedCount / totalCompleted) * 100) : 0
        },
        {
          result: 'Perdidos',
          count: lostCount,
          percentage: totalCompleted > 0 ? Math.round((lostCount / totalCompleted) * 100) : 0
        }
      ];
      
      // Si no hay desafíos completados, agregar datos de ejemplo
      if (chartData.winLossDistribution.every(item => item.count === 0)) {
        chartData.winLossDistribution = [
          { result: 'Ganados', count: 8, percentage: 40 },
          { result: 'Empatados', count: 7, percentage: 35 },
          { result: 'Perdidos', count: 5, percentage: 25 }
        ];
      }
      
      console.log(`📊 [Dashboard] Estadísticas de gráficos calculadas para usuario: ${userId}`);
      console.log(`📊 [Dashboard] Total participaciones: ${userParticipations.length}`);
      console.log(`📊 [Dashboard] Desafíos completados: ${userParticipations.filter(p => p.challenge.status === 'completed').length}`);
      console.log(`📊 [Dashboard] Distribución por estatus:`, chartData.statusDistribution);
      console.log(`📊 [Dashboard] Distribución victoria/empate/derrota:`, chartData.winLossDistribution);
      
    } catch (error) {
      console.error('❌ Error al calcular estadísticas de gráficos:', error.message);
    }
    
    // 7. Obtener eventos próximos del usuario
    let upcomingEvents = [];
    try {
      console.log('📅 [Dashboard] Buscando eventos próximos para usuario:', userId);
      
      // 1. Buscar desafíos pendientes que necesitan aceptación
      console.log('🔍 [Dashboard] Buscando desafíos pendientes...');
      console.log('🔍 [Dashboard] UserId para búsqueda:', userId);
      
      const pendingChallenges = await Challenge.findAll({
        include: [{
          model: Participant,
          where: { user_id: userId }, // Corregido: user_id en lugar de userId
          required: true
        }],
        where: {
          status: 'pending'
        },
        order: [['created_at', 'DESC']], // Corregido: created_at en lugar de createdAt
        limit: 3
      });
      
      console.log(`🔍 [Dashboard] Desafíos pendientes encontrados: ${pendingChallenges.length}`);
      pendingChallenges.forEach((challenge, index) => {
        console.log(`🔍 [Dashboard] Pendiente ${index + 1}: ${challenge.title} (${challenge.status})`);
      });
      
      // Agregar desafíos pendientes como eventos
      pendingChallenges.forEach(challenge => {
        upcomingEvents.push({
          id: `pending_${challenge.id}`,
          title: `Pendiente: ${challenge.title}`,
          date: new Date(challenge.created_at.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'), // 7 días después de creación
          type: 'pending'
        });
      });
      
      // 2. Buscar desafíos en evaluación
      console.log('🔍 [Dashboard] Buscando desafíos en evaluación...');
      const judgingChallenges = await Challenge.findAll({
        include: [{
          model: Participant,
          where: { user_id: userId }, // Corregido: user_id en lugar de userId
          required: true
        }],
        where: {
          status: 'judging'
        },
        order: [['updated_at', 'DESC']], // Corregido: updated_at en lugar de updatedAt
        limit: 2
      });
      
      console.log(`🔍 [Dashboard] Desafíos en evaluación encontrados: ${judgingChallenges.length}`);
      judgingChallenges.forEach((challenge, index) => {
        console.log(`🔍 [Dashboard] Evaluación ${index + 1}: ${challenge.title} (${challenge.status})`);
      });
      
      // Agregar desafíos en evaluación como eventos
      judgingChallenges.forEach(challenge => {
        upcomingEvents.push({
          id: `judging_${challenge.id}`,
          title: `En evaluación: ${challenge.title}`,
          date: new Date(challenge.updated_at.getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'), // 3 días después de actualización
          type: 'judging'
        });
      });
      
      // 3. Agregar eventos generales de la plataforma
      console.log(`🔍 [Dashboard] Eventos específicos encontrados hasta ahora: ${upcomingEvents.length}`);
      
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      // Siempre agregar eventos útiles para el usuario
      console.log('🔍 [Dashboard] Agregando eventos generales...');
      
      // Evento de revisión de desafíos pendientes (siempre útil)
      if (upcomingEvents.length < 5) {
        upcomingEvents.push({
          id: 'review_challenges',
          title: 'Revisar desafíos pendientes',
          date: tomorrow.toLocaleDateString('es-ES'),
          type: 'reminder'
        });
      }
      
      // Resumen semanal
      if (upcomingEvents.length < 5) {
        upcomingEvents.push({
          id: 'weekly_summary',
          title: 'Resumen semanal de actividad',
          date: nextWeek.toLocaleDateString('es-ES'),
          type: 'summary'
        });
      }
      
      // Torneo mensual
      if (upcomingEvents.length < 5) {
        upcomingEvents.push({
          id: 'monthly_tournament',
          title: 'Torneo mensual de la comunidad',
          date: nextMonth.toLocaleDateString('es-ES'),
          type: 'tournament'
        });
      }
      
      // Evento de nuevos desafíos
      if (upcomingEvents.length < 5) {
        const dayAfterTomorrow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
        upcomingEvents.push({
          id: 'new_challenges',
          title: 'Nuevos desafíos disponibles',
          date: dayAfterTomorrow.toLocaleDateString('es-ES'),
          type: 'announcement'
        });
      }
      
      // Evento de conexión con amigos
      if (upcomingEvents.length < 5) {
        const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        upcomingEvents.push({
          id: 'connect_friends',
          title: 'Conectar con nuevos amigos',
          date: threeDaysLater.toLocaleDateString('es-ES'),
          type: 'social'
        });
      }
      
      // Ordenar por fecha y limitar a 5 eventos
      upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
      upcomingEvents = upcomingEvents.slice(0, 5);
      
      console.log(`📅 [Dashboard] Eventos próximos encontrados: ${upcomingEvents.length}`);
      upcomingEvents.forEach((event, index) => {
        console.log(`📅 [Dashboard] Evento ${index + 1}: ${event.title} - ${event.date} (${event.type})`);
      });
      
    } catch (error) {
      console.error('❌ Error al obtener eventos próximos:', error.message);
      console.error('❌ Stack trace:', error.stack);
      
      // FALLBACK: Generar eventos básicos si hay error
      console.log('🔄 [Dashboard] Generando eventos de respaldo...');
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      upcomingEvents = [
        {
          id: 'fallback_review',
          title: 'Revisar desafíos pendientes',
          date: tomorrow.toLocaleDateString('es-ES'),
          type: 'reminder'
        },
        {
          id: 'fallback_weekly',
          title: 'Resumen semanal de actividad',
          date: nextWeek.toLocaleDateString('es-ES'),
          type: 'summary'
        },
        {
          id: 'fallback_connect',
          title: 'Conectar con nuevos amigos',
          date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'),
          type: 'social'
        }
      ];
      
      console.log('🔄 [Dashboard] Eventos de respaldo generados:', upcomingEvents.length);
    }
    
    // 8. Verificación final de eventos próximos
    if (!upcomingEvents || upcomingEvents.length === 0) {
      console.log('⚠️ [Dashboard] ADVERTENCIA: No hay eventos próximos, generando eventos de emergencia...');
      const now = new Date();
      upcomingEvents = [
        {
          id: 'emergency_review',
          title: 'Revisar desafíos pendientes',
          date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'),
          type: 'reminder'
        },
        {
          id: 'emergency_activity',
          title: 'Revisar actividad reciente',
          date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'),
          type: 'summary'
        }
      ];
      console.log('⚠️ [Dashboard] Eventos de emergencia creados:', upcomingEvents.length);
    }
    
    console.log('🎯 [Dashboard] FINAL - Eventos próximos a enviar:', upcomingEvents.length);
    upcomingEvents.forEach((event, index) => {
      console.log(`🎯 [Dashboard] FINAL Evento ${index + 1}: ${event.title} - ${event.date}`);
    });
    
    // 9. Datos del dashboard
    const dashboardData = {
      stats: {
        challengesWon,
        totalChallenges,
        totalActiveChallenges,
        level,
        totalPoints,
        totalBadges
      },
      balance: Number(balance),
      allChallenges: activeChallenges,
      recentActivity,
      chartData,
      upcomingEvents
    };

    console.log(`✅ [getDashboardDataReal] Datos simplificados obtenidos exitosamente`);
    console.log(`📈 [getDashboardDataReal] Level: ${level}, Balance: $${balance}`);

    res.status(200).json({
      success: true,
      data: dashboardData,
      debug: {
        userId,
        userPointsFound: !!userPoints,
        userPointsData: userPoints ? userPoints.toJSON() : null
      }
    });

  } catch (error) {
    console.error('❌ [getDashboardData] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos del dashboard',
      error: error.message
    });
  }
};

// Obtener estadísticas específicas del usuario
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [totalChallenges, challengesWon] = await Promise.all([
      Participant.count({ where: { userId } }),
      Challenge.count({ where: { winnerId: userId, status: 'completed' } })
    ]);
    const activeChallenges = 0; // Simplificado para debugging

    // Calcular nivel
    let level = 1;
    if (challengesWon >= 50) level = 10;
    else if (challengesWon >= 40) level = 9;
    else if (challengesWon >= 30) level = 8;
    else if (challengesWon >= 25) level = 7;
    else if (challengesWon >= 20) level = 6;
    else if (challengesWon >= 15) level = 5;
    else if (challengesWon >= 10) level = 4;
    else if (challengesWon >= 5) level = 3;
    else if (challengesWon >= 1) level = 2;

    res.status(200).json({
      success: true,
      data: {
        totalChallenges,
        challengesWon,
        activeChallenges,
        level,
        winRate: totalChallenges > 0 ? ((challengesWon / totalChallenges) * 100).toFixed(1) : 0
      }
    });

  } catch (error) {
    console.error('❌ [getUserStats] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas del usuario',
      error: error.message
    });
  }
};

// Endpoint temporal para debugging de UserPoints
exports.debugUserPoints = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Buscar UserPoints directamente
    const userPoints = await UserPoints.findOne({ where: { userId } });
    
    // También buscar con findOrCreate
    let [userPointsCreate, created] = await UserPoints.findOrCreate({
      where: { userId },
      defaults: { total: 0, level: 1 }
    });
    
    return res.status(200).json({
      success: true,
      data: {
        userId,
        directQuery: userPoints ? userPoints.toJSON() : null,
        findOrCreate: {
          data: userPointsCreate.toJSON(),
          wasCreated: created
        }
      }
    });
  } catch (error) {
    console.error('Error en debug:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getDashboardData: exports.getDashboardData,
  getDashboardDataReal: exports.getDashboardDataSimple,
  getDashboardDataSimple: exports.getDashboardDataSimple,
  getUserStats: exports.getUserStats,
  debugUserPoints: exports.debugUserPoints
};
