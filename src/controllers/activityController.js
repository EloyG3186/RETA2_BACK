const PointHistory = require('../models/PointHistory');
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const { Op } = require('sequelize');

const activityController = {
  // Obtener actividad reciente del usuario
  async getRecentActivity(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 10;

      // Obtener historial de puntos reciente (últimos 30 días)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const pointHistory = await PointHistory.findAll({
        where: {
          userId: userId,
          createdAt: {
            [Op.gte]: thirtyDaysAgo
          }
        },
        order: [['createdAt', 'DESC']],
        limit: limit,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'fullName']
          }
        ]
      });

      // Transformar los datos del historial de puntos a formato de actividad
      const activities = pointHistory.map(point => {
        let activityType = 'created';
        let title = point.reason || 'Actividad';
        
        // Determinar el tipo de actividad basado en el actionType
        switch (point.actionType) {
          case 'create_challenge':
            activityType = 'created';
            title = `Creaste un desafío`;
            break;
          case 'accept_challenge':
            activityType = 'created';
            title = `Aceptaste un desafío`;
            break;
          case 'complete_challenge':
            activityType = 'win';
            title = `Completaste un desafío`;
            break;
          case 'win_challenge':
            activityType = 'win';
            title = `Ganaste un desafío`;
            break;
          case 'judge_challenge':
            activityType = 'created';
            title = `Actuaste como juez`;
            break;
          case 'complete_judge_task':
            activityType = 'win';
            title = `Completaste una tarea de juez`;
            break;
          default:
            activityType = 'created';
            title = point.reason || 'Actividad de puntos';
        }

        return {
          id: point.id,
          type: activityType,
          title: title,
          description: point.reason || '',
          amount: point.points,
          date: point.createdAt
        };
      });

      res.json(activities);
    } catch (error) {
      console.error('Error al obtener actividad reciente:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        message: 'No se pudo obtener la actividad reciente'
      });
    }
  },

  // Obtener historial completo de actividad del usuario
  async getActivityHistory(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      // Obtener historial de puntos paginado
      const { count, rows: pointHistory } = await PointHistory.findAndCountAll({
        where: {
          userId: userId
        },
        order: [['createdAt', 'DESC']],
        offset: offset,
        limit: limit,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'fullName']
          }
        ]
      });

      // Transformar los datos
      const activities = pointHistory.map(point => ({
        id: point.id,
        type: point.actionType === 'win_challenge' ? 'win' : 'created',
        title: point.reason || 'Actividad',
        description: point.reason || '',
        amount: point.points,
        date: point.createdAt,
        relatedEntity: point.relatedEntityId
      }));

      res.json({
        activities,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Error al obtener historial de actividad:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        message: 'No se pudo obtener el historial de actividad'
      });
    }
  }
};

module.exports = activityController;
