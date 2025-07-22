const { RewardRule, PointHistory, User, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Obtener todas las reglas de recompensas activas
 */
exports.getRewardRules = async (req, res) => {
  try {
    const rules = await RewardRule.findAll({
      where: { isActive: true },
      order: [['displayOrder', 'ASC'], ['created_at', 'ASC']]
    });

    // Formatear datos para el frontend
    const formattedRules = rules.map(rule => ({
      id: rule.id.toString(),
      title: rule.title,
      description: rule.description,
      points: rule.points,
      icon: rule.icon,
      color: rule.color
    }));

    return res.status(200).json(formattedRules);
  } catch (error) {
    console.error('Error al obtener reglas de recompensas:', error);
    return res.status(500).json({ message: 'Error al obtener reglas de recompensas' });
  }
};

/**
 * Obtener historial de puntos del usuario actual
 */
exports.getPointHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await PointHistory.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['username', 'fullName']
        }
      ]
    });

    // Formatear datos para el frontend
    const formattedHistory = rows.map(entry => ({
      id: entry.id,
      actionType: entry.actionType,
      points: entry.points,
      reason: entry.reason,
      relatedEntityType: entry.relatedEntityType,
      relatedEntityId: entry.relatedEntityId,
      metadata: entry.metadata,
      previousTotal: entry.previousTotal,
      newTotal: entry.newTotal,
      previousLevel: entry.previousLevel,
      newLevel: entry.newLevel,
      levelUp: entry.newLevel > entry.previousLevel,
      createdAt: entry.createdAt.toISOString(),
      user: entry.user
    }));

    return res.status(200).json({
      history: formattedHistory,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Error al obtener historial de puntos:', error);
    return res.status(500).json({ message: 'Error al obtener historial de puntos' });
  }
};

/**
 * ADMIN: Obtener todas las reglas de recompensas (activas e inactivas)
 */
exports.getAllRewardRules = async (req, res) => {
  try {
    // Verificar que el usuario sea administrador
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso no autorizado' });
    }

    const rules = await RewardRule.findAll({
      order: [['displayOrder', 'ASC'], ['createdAt', 'ASC']]
    });

    return res.status(200).json(rules);
  } catch (error) {
    console.error('Error al obtener todas las reglas de recompensas:', error);
    return res.status(500).json({ message: 'Error al obtener reglas de recompensas' });
  }
};

/**
 * ADMIN: Crear nueva regla de recompensa
 */
exports.createRewardRule = async (req, res) => {
  try {
    // Verificar que el usuario sea administrador
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso no autorizado' });
    }

    const {
      actionType,
      title,
      description,
      points,
      iconName,
      colorClass,
      displayOrder
    } = req.body;

    // Validaciones
    if (!actionType || !title || !description || points === undefined) {
      return res.status(400).json({ 
        message: 'Faltan campos requeridos: actionType, title, description, points' 
      });
    }

    // Verificar que el actionType no exista
    const existingRule = await RewardRule.findOne({ where: { actionType } });
    if (existingRule) {
      return res.status(400).json({ 
        message: 'Ya existe una regla para este tipo de acción' 
      });
    }

    const newRule = await RewardRule.create({
      actionType,
      title,
      description,
      points,
      iconName: iconName || 'FaTrophy',
      colorClass: colorClass || 'cd-text-blue-500',
      displayOrder: displayOrder || 0,
      isActive: true
    });

    return res.status(201).json(newRule);
  } catch (error) {
    console.error('Error al crear regla de recompensa:', error);
    return res.status(500).json({ message: 'Error al crear regla de recompensa' });
  }
};

/**
 * ADMIN: Actualizar regla de recompensa
 */
exports.updateRewardRule = async (req, res) => {
  try {
    // Verificar que el usuario sea administrador
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso no autorizado' });
    }

    const { id } = req.params;
    const {
      actionType,
      title,
      description,
      points,
      iconName,
      colorClass,
      displayOrder,
      isActive
    } = req.body;

    const rule = await RewardRule.findByPk(id);
    if (!rule) {
      return res.status(404).json({ message: 'Regla no encontrada' });
    }

    // Si se está cambiando el actionType, verificar que no exista otro con el mismo
    if (actionType && actionType !== rule.actionType) {
      const existingRule = await RewardRule.findOne({ 
        where: { 
          actionType,
          id: { [Op.ne]: id }
        } 
      });
      if (existingRule) {
        return res.status(400).json({ 
          message: 'Ya existe una regla para este tipo de acción' 
        });
      }
    }

    await rule.update({
      actionType: actionType || rule.actionType,
      title: title || rule.title,
      description: description || rule.description,
      points: points !== undefined ? points : rule.points,
      iconName: iconName || rule.iconName,
      colorClass: colorClass || rule.colorClass,
      displayOrder: displayOrder !== undefined ? displayOrder : rule.displayOrder,
      isActive: isActive !== undefined ? isActive : rule.isActive
    });

    return res.status(200).json(rule);
  } catch (error) {
    console.error('Error al actualizar regla de recompensa:', error);
    return res.status(500).json({ message: 'Error al actualizar regla de recompensa' });
  }
};

/**
 * ADMIN: Eliminar regla de recompensa
 */
exports.deleteRewardRule = async (req, res) => {
  try {
    // Verificar que el usuario sea administrador
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso no autorizado' });
    }

    const { id } = req.params;

    const rule = await RewardRule.findByPk(id);
    if (!rule) {
      return res.status(404).json({ message: 'Regla no encontrada' });
    }

    await rule.destroy();

    return res.status(200).json({ message: 'Regla eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar regla de recompensa:', error);
    return res.status(500).json({ message: 'Error al eliminar regla de recompensa' });
  }
};

/**
 * ADMIN: Obtener estadísticas de puntos
 */
exports.getPointsStats = async (req, res) => {
  try {
    // Verificar que el usuario sea administrador
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso no autorizado' });
    }

    // Estadísticas por tipo de acción (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const statsByAction = await PointHistory.findAll({
      attributes: [
        'actionType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('points')), 'totalPoints']
      ],
      where: {
        createdAt: { [Op.gte]: thirtyDaysAgo }
      },
      group: ['actionType'],
      order: [[sequelize.literal('totalPoints'), 'DESC']]
    });

    // Total de puntos otorgados
    const totalStats = await PointHistory.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalTransactions'],
        [sequelize.fn('SUM', sequelize.col('points')), 'totalPointsAwarded']
      ],
      where: {
        createdAt: { [Op.gte]: thirtyDaysAgo }
      }
    });

    return res.status(200).json({
      statsByAction,
      totalStats,
      period: 'last_30_days'
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de puntos:', error);
    return res.status(500).json({ message: 'Error al obtener estadísticas de puntos' });
  }
};
