const { User, UserPoints, Badge, UserBadge, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Obtener los puntos del usuario actual
 */
exports.getUserPoints = async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar o crear puntos del usuario
    let [userPoints, created] = await UserPoints.findOrCreate({
      where: { userId },
      defaults: { total: 0, level: 1 }
    });

    // Calcular nivel y progreso
    const level = userPoints.level;
    const total = userPoints.total;
    
    // Calcular puntos necesarios para el siguiente nivel
    // Fórmula: 100 * (nivel actual)^1.5
    const nextLevelPoints = Math.round(100 * Math.pow(level, 1.5));
    
    // Calcular puntos necesarios para el nivel actual
    const currentLevelThreshold = level > 1 ? Math.round(100 * Math.pow(level - 1, 1.5)) : 0;
    
    // Calcular progreso hacia el siguiente nivel (porcentaje)
    const pointsForNextLevel = nextLevelPoints - currentLevelThreshold;
    const pointsEarnedInCurrentLevel = total - currentLevelThreshold;
    const progress = Math.min(Math.round((pointsEarnedInCurrentLevel / pointsForNextLevel) * 100), 100);

    return res.status(200).json({
      total,
      level,
      nextLevelPoints,
      progress
    });
  } catch (error) {
    console.error('Error al obtener puntos del usuario:', error);
    return res.status(500).json({ message: 'Error al obtener puntos del usuario' });
  }
};

/**
 * Obtener las insignias del usuario actual
 */
exports.getUserBadges = async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener insignias del usuario
    const userBadges = await UserBadge.findAll({
      where: { userId },
      include: [{ model: Badge, as: 'Badge' }],
      order: [['dateEarned', 'DESC']]
    });

    // Formatear datos para el frontend
    const badges = userBadges.map(userBadge => ({
      id: userBadge.Badge.id.toString(),
      name: userBadge.Badge.name,
      description: userBadge.Badge.description,
      imageUrl: userBadge.Badge.imageUrl || `/badges/${userBadge.Badge.category}-default.svg`,
      category: userBadge.Badge.category,
      dateEarned: userBadge.dateEarned.toISOString().split('T')[0],
      isEarned: true
    }));

    return res.status(200).json(badges);
  } catch (error) {
    console.error('Error al obtener insignias del usuario:', error);
    return res.status(500).json({ message: 'Error al obtener insignias del usuario' });
  }
};

/**
 * Obtener todas las insignias disponibles (obtenidas y no obtenidas)
 */
exports.getAllBadges = async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener todas las insignias
    const allBadges = await Badge.findAll();
    
    // Obtener las insignias que el usuario ya tiene
    const userBadges = await UserBadge.findAll({
      where: { userId },
      attributes: ['badgeId', 'dateEarned']
    });
    
    // Crear un mapa de insignias obtenidas para fácil acceso
    const earnedBadgesMap = {};
    userBadges.forEach(badge => {
      earnedBadgesMap[badge.badgeId] = badge.dateEarned;
    });
    
    // Definir el orden de dificultad para cada insignia
    const badgeDifficultyOrder = {
      // DESAFÍOS - Progresión por número de desafíos
      'Primer Desafío': 1,
      'Desafiante': 2,
      'Campeón': 3,
      
      // SOCIAL - Progresión social
      'Red Social': 1,
      'Influencer': 2,
      'Miembro Fundador': 3,
      
      // JUEZ - Progresión de evaluación
      'Juez Imparcial': 1,
      'Árbitro Experto': 2,
      
      // ESPECIAL/NIVEL - Progresión por nivel
      'Aprendiz': 1,
      'Experto': 2,
      'Maestro': 3,
      'Participante Activo': 2
    };
    
    // Formatear datos para el frontend
    const badges = allBadges.map(badge => ({
      id: badge.id.toString(),
      name: badge.name,
      description: badge.description,
      imageUrl: badge.imageUrl || `/badges/${badge.category}-default.svg`,
      category: badge.category,
      dateEarned: earnedBadgesMap[badge.id] ? earnedBadgesMap[badge.id].toISOString().split('T')[0] : undefined,
      isEarned: !!earnedBadgesMap[badge.id],
      difficulty: badgeDifficultyOrder[badge.name] || 99
    }));
    
    // Ordenar las insignias: primero por categoría, luego por dificultad (ascendente)
    const orderedBadges = badges.sort((a, b) => {
      // Orden de categorías
      const categoryOrder = { 'challenges': 1, 'social': 2, 'judge': 3, 'special': 4 };
      
      if (a.category !== b.category) {
        return (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99);
      }
      
      // Dentro de la misma categoría, ordenar por dificultad
      return a.difficulty - b.difficulty;
    });

    return res.status(200).json(orderedBadges);
  } catch (error) {
    console.error('Error al obtener todas las insignias:', error);
    return res.status(500).json({ message: 'Error al obtener todas las insignias' });
  }
};

/**
 * Obtener tabla de clasificación
 */
// Función duplicada eliminada - usar la versión con paginación y filtros más abajo

/**
 * Obtener posición del usuario en la tabla de clasificación
 */
exports.getUserRank = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener puntos del usuario actual
    const currentUserPoints = await UserPoints.findOne({
      where: { userId },
      attributes: ['total']
    });
    
    if (!currentUserPoints) {
      return res.status(404).json({ message: 'Usuario no encontrado en el sistema de puntos' });
    }
    
    // Contar usuarios con más puntos que el usuario actual
    const userRank = await UserPoints.count({
      where: {
        total: {
          [Op.gt]: currentUserPoints.total
        }
      }
    });
    
    // Contar total de usuarios con puntos
    const totalUsers = await UserPoints.count();
    
    return res.status(200).json({
      rank: userRank + 1, // +1 porque el conteo empieza en 0
      total: totalUsers
    });
  } catch (error) {
    console.error('Error al obtener rango del usuario:', error);
    return res.status(500).json({ message: 'Error al obtener rango del usuario' });
  }
};

/**
 * Obtener tabla de clasificación de usuarios
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    
    // Obtener usuarios ordenados por puntos - solo usuarios con rol 'user'
    const leaderboard = await UserPoints.findAll({
      include: [{
        model: User,
        attributes: ['id', 'username', 'fullName', 'profilePicture', 'role'],
        where: { role: 'user' } // Filtrar solo usuarios normales, excluir administradores
      }],
      order: [['total', 'DESC'], ['level', 'DESC']],
      limit: limit,
      offset: offset
    });
    
    // Formatear datos para el frontend
    const formattedLeaderboard = leaderboard.map((entry, index) => ({
      rank: offset + index + 1,
      userId: entry.userId,
      username: entry.User?.username || 'Usuario',
      fullName: entry.User?.fullName || 'Sin nombre',
      profilePicture: entry.User?.profilePicture || 'default-profile.png',
      total: entry.total,
      level: entry.level
    }));
    
    // Contar total de usuarios con puntos
    const totalUsers = await UserPoints.count();
    
    return res.status(200).json({
      leaderboard: formattedLeaderboard,
      pagination: {
        page: page,
        limit: limit,
        total: totalUsers,
        pages: Math.ceil(totalUsers / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener tabla de clasificación:', error);
    return res.status(500).json({ message: 'Error al obtener tabla de clasificación' });
  }
};

/**
 * Añadir puntos a un usuario
 * Esta función es para uso interno, no expuesta como API
 */
exports.addPoints = async (userId, points, reason) => {
  try {
    const transaction = await sequelize.transaction();
    
    try {
      // Buscar o crear puntos del usuario
      let [userPoints, created] = await UserPoints.findOrCreate({
        where: { userId },
        defaults: { total: 0, level: 1 },
        transaction
      });
      
      // Actualizar total de puntos
      const newTotal = userPoints.total + points;
      
      // Calcular nuevo nivel
      // Fórmula: nivel = floor(1 + raíz cúbica(puntos totales / 100))
      const newLevel = Math.floor(1 + Math.cbrt(newTotal / 100));
      
      // Actualizar puntos y nivel
      await userPoints.update({
        total: newTotal,
        level: newLevel
      }, { transaction });
      
      // Si el nivel aumentó, verificar si se deben otorgar insignias
      if (newLevel > userPoints.level) {
        await checkLevelBadges(userId, newLevel, transaction);
      }
      
      await transaction.commit();
      return { success: true, newTotal, newLevel };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error al añadir puntos al usuario:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verificar y otorgar insignias basadas en el nivel
 * Esta función es para uso interno
 */
async function checkLevelBadges(userId, level, transaction) {
  try {
    // Definir insignias basadas en nivel
    const levelBadges = [
      { level: 3, category: 'special', name: 'Aprendiz', description: 'Alcanzaste el nivel 3' },
      { level: 5, category: 'special', name: 'Experto', description: 'Alcanzaste el nivel 5' },
      { level: 10, category: 'special', name: 'Maestro', description: 'Alcanzaste el nivel 10' }
    ];
    
    // Verificar si el usuario merece alguna insignia nueva
    for (const badgeInfo of levelBadges) {
      if (level >= badgeInfo.level) {
        // Buscar si la insignia existe
        let badge = await Badge.findOne({
          where: { name: badgeInfo.name, category: badgeInfo.category },
          transaction
        });
        
        // Si no existe, crearla
        if (!badge) {
          badge = await Badge.create({
            name: badgeInfo.name,
            description: badgeInfo.description,
            category: badgeInfo.category
          }, { transaction });
        }
        
        // Verificar si el usuario ya tiene esta insignia
        const hasBadge = await UserBadge.findOne({
          where: { userId, badgeId: badge.id },
          transaction
        });
        
        // Si no la tiene, otorgarla
        if (!hasBadge) {
          await UserBadge.create({
            userId,
            badgeId: badge.id,
            dateEarned: new Date()
          }, { transaction });
        }
      }
    }
  } catch (error) {
    console.error('Error al verificar insignias por nivel:', error);
    throw error;
  }
}

/**
 * Otorgar una insignia a un usuario
 * Esta función es para uso interno, no expuesta como API
 */
exports.awardBadge = async (userId, badgeName, badgeDescription, badgeCategory) => {
  try {
    const transaction = await sequelize.transaction();
    
    try {
      // Buscar si la insignia existe
      let badge = await Badge.findOne({
        where: { name: badgeName, category: badgeCategory },
        transaction
      });
      
      // Si no existe, crearla
      if (!badge) {
        badge = await Badge.create({
          name: badgeName,
          description: badgeDescription,
          category: badgeCategory
        }, { transaction });
      }
      
      // Verificar si el usuario ya tiene esta insignia
      const hasBadge = await UserBadge.findOne({
        where: { userId, badgeId: badge.id },
        transaction
      });
      
      // Si no la tiene, otorgarla
      if (!hasBadge) {
        await UserBadge.create({
          userId,
          badgeId: badge.id,
          dateEarned: new Date()
        }, { transaction });
        
        await transaction.commit();
        return { success: true, badgeId: badge.id };
      }
      
      await transaction.commit();
      return { success: false, reason: 'El usuario ya tiene esta insignia' };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error al otorgar insignia al usuario:', error);
    return { success: false, error: error.message };
  }
};
