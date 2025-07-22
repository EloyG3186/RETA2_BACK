const { UserPoints, Badge, UserBadge, RewardRule, PointHistory, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Servicio para gestionar la gamificación en la aplicación
 */
const gamificationService = {
  /**
   * Añadir puntos a un usuario por una acción específica
   * @param {number} userId - ID del usuario
   * @param {number} points - Cantidad de puntos a añadir
   * @param {string} reason - Razón por la que se otorgan los puntos
   * @param {Object} options - Opciones adicionales
   * @param {string} options.actionType - Tipo de acción para el historial
   * @param {string} options.relatedEntityType - Tipo de entidad relacionada
   * @param {string} options.relatedEntityId - ID de la entidad relacionada
   * @param {Object} options.metadata - Metadata adicional
   * @returns {Promise<Object>} Resultado de la operación
   */
  addPoints: async (userId, points, reason, options = {}) => {
    try {
      const transaction = await sequelize.transaction();
      
      try {
        // Buscar o crear puntos del usuario
        let [userPoints, created] = await UserPoints.findOrCreate({
          where: { userId },
          defaults: { total: 0, level: 1 },
          transaction
        });
        
        // Guardar valores anteriores para el historial
        const previousTotal = userPoints.total;
        const previousLevel = userPoints.level;
        
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
        
        // Registrar en el historial de puntos
        await PointHistory.create({
          userId,
          actionType: options.actionType || 'manual',
          points,
          reason,
          relatedEntityType: options.relatedEntityType || null,
          relatedEntityId: options.relatedEntityId || null,
          metadata: options.metadata || null,
          previousTotal,
          newTotal,
          previousLevel,
          newLevel
        }, { transaction });
        
        // Si el nivel aumentó, verificar si se deben otorgar insignias
        if (newLevel > previousLevel) {
          await gamificationService.checkLevelBadges(userId, newLevel, transaction);
        }
        
        await transaction.commit();
        return { 
          success: true, 
          newTotal, 
          newLevel, 
          previousTotal, 
          previousLevel,
          levelUp: newLevel > previousLevel
        };
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error al añadir puntos al usuario:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Verificar y otorgar insignias basadas en el nivel
   * @param {number} userId - ID del usuario
   * @param {number} level - Nivel actual del usuario
   * @param {Transaction} transaction - Transacción activa de Sequelize
   * @returns {Promise<void>}
   */
  checkLevelBadges: async (userId, level, transaction) => {
    try {
      // Definir insignias basadas en nivel
      const levelBadges = [
        { level: 3, name: 'Aprendiz' },
        { level: 5, name: 'Experto' },
        { level: 10, name: 'Maestro' }
      ];
      
      // Verificar si el usuario merece alguna insignia nueva
      for (const badgeInfo of levelBadges) {
        if (level >= badgeInfo.level) {
          // Buscar la insignia
          const badge = await Badge.findOne({
            where: { name: badgeInfo.name, category: 'special' },
            transaction
          });
          
          if (badge) {
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
              
              console.log(`Insignia "${badgeInfo.name}" otorgada al usuario ${userId} por alcanzar nivel ${level}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error al verificar insignias por nivel:', error);
      throw error;
    }
  },
  
  /**
   * Otorgar una insignia a un usuario
   * @param {number} userId - ID del usuario
   * @param {string} badgeName - Nombre de la insignia
   * @returns {Promise<Object>} Resultado de la operación
   */
  awardBadge: async (userId, badgeName) => {
    try {
      const transaction = await sequelize.transaction();
      
      try {
        // Buscar la insignia
        const badge = await Badge.findOne({
          where: { name: badgeName },
          transaction
        });
        
        if (!badge) {
          await transaction.rollback();
          return { success: false, reason: 'Insignia no encontrada' };
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
          return { success: true, badgeId: badge.id, badgeName: badge.name };
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
  },
  
  /**
   * Verificar y otorgar insignias basadas en desafíos completados
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object>} Resultado de la operación
   */
  checkChallengeBadges: async (userId) => {
    try {
      // Esta función se implementará cuando se integre con el sistema de desafíos
      // Por ahora, es un placeholder
      return { success: true, message: 'Verificación de insignias de desafíos pendiente de implementación' };
    } catch (error) {
      console.error('Error al verificar insignias de desafíos:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Verificar y otorgar insignias basadas en actividad social
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object>} Resultado de la operación
   */
  checkSocialBadges: async (userId) => {
    try {
      // Esta función se implementará cuando se integre con el sistema social
      // Por ahora, es un placeholder
      return { success: true, message: 'Verificación de insignias sociales pendiente de implementación' };
    } catch (error) {
      console.error('Error al verificar insignias sociales:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Verificar y otorgar insignias basadas en actividad como juez
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object>} Resultado de la operación
   */
  checkJudgeBadges: async (userId) => {
    try {
      // Esta función se implementará cuando se integre con el sistema de jueces
      // Por ahora, es un placeholder
      return { success: true, message: 'Verificación de insignias de juez pendiente de implementación' };
    } catch (error) {
      console.error('Error al verificar insignias de juez:', error);
      return { success: false, error: error.message };
    }
  }
};

module.exports = gamificationService;
