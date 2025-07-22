const { User } = require('../models');

/**
 * Obtiene las preferencias de notificación de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} - Preferencias de notificación
 */
const getNotificationPreferences = async (userId) => {
  try {
    // Buscar el usuario por ID
    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    
    // Si no hay preferencias guardadas, devolver valores predeterminados
    return {
      emailEnabled: user.emailEnabled || false,
      weeklyReport: user.weeklyReport || false,
      monthlyReport: user.monthlyReport || false,
      challengeReminders: user.challengeReminders || false,
      emailFrequency: user.emailFrequency || 'weekly'
    };
  } catch (error) {
    console.error('Error al obtener preferencias de notificación:', error);
    throw error;
  }
};

/**
 * Actualiza las preferencias de notificación de un usuario
 * @param {string} userId - ID del usuario
 * @param {Object} preferences - Nuevas preferencias
 * @returns {Promise<Object>} - Preferencias actualizadas
 */
const updateNotificationPreferences = async (userId, preferences) => {
  try {
    // Buscar el usuario por ID
    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    
    // Actualizar solo los campos proporcionados
    if (preferences.emailEnabled !== undefined) {
      user.emailEnabled = preferences.emailEnabled;
    }
    
    if (preferences.weeklyReport !== undefined) {
      user.weeklyReport = preferences.weeklyReport;
    }
    
    if (preferences.monthlyReport !== undefined) {
      user.monthlyReport = preferences.monthlyReport;
    }
    
    if (preferences.challengeReminders !== undefined) {
      user.challengeReminders = preferences.challengeReminders;
    }
    
    if (preferences.emailFrequency) {
      user.emailFrequency = preferences.emailFrequency;
    }
    
    // Guardar cambios
    await user.save();
    
    return {
      emailEnabled: user.emailEnabled,
      weeklyReport: user.weeklyReport,
      monthlyReport: user.monthlyReport,
      challengeReminders: user.challengeReminders,
      emailFrequency: user.emailFrequency
    };
  } catch (error) {
    console.error('Error al actualizar preferencias de notificación:', error);
    throw error;
  }
};

/**
 * Obtiene usuarios con notificaciones habilitadas
 * @param {string} type - Tipo de notificación ('weekly', 'monthly', etc.)
 * @returns {Promise<Array>} - Lista de usuarios
 */
const getUsersWithNotificationsEnabled = async (type) => {
  try {
    let whereClause = { isActive: true, emailEnabled: true };
    
    // Añadir condición específica según el tipo
    if (type === 'weekly') {
      whereClause.weeklyReport = true;
    } else if (type === 'monthly') {
      whereClause.monthlyReport = true;
    } else if (type === 'challenges') {
      whereClause.challengeReminders = true;
    }
    
    const users = await User.findAll({
      where: whereClause,
      attributes: ['id', 'email', 'username', 'fullName']
    });
    
    return users;
  } catch (error) {
    console.error(`Error al obtener usuarios con notificaciones ${type}:`, error);
    throw error;
  }
};

module.exports = {
  getNotificationPreferences,
  updateNotificationPreferences,
  getUsersWithNotificationsEnabled
};
