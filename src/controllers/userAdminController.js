const User = require('../models/User');
const Wallet = require('../models/Wallet');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

/**
 * Obtener todos los usuarios para el panel de administración
 */
exports.getAllUsers = async (req, res) => {
  try {
    console.log('🔍 Buscando todos los usuarios para administración');

    // Primero consultar la estructura de la tabla users
    console.log('🔍 Verificando la estructura de la tabla users');
    try {
      const tableInfo = await sequelize.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position",
        { type: QueryTypes.SELECT }
      );
      console.log('📊 Estructura de tabla users:', JSON.stringify(tableInfo));
    } catch (schemaError) {
      console.error('❌ Error al obtener estructura de tabla:', schemaError);
    }

    // Intentar obtener usuarios en formato raw primero para diagnóstico
    try {
      const rawUsers = await sequelize.query('SELECT * FROM users LIMIT 5', { type: QueryTypes.SELECT });
      console.log('📊 Muestra de usuarios (raw):', JSON.stringify(rawUsers));
    } catch (rawError) {
      console.error('❌ Error al obtener usuarios raw:', rawError);
    }
    
    console.log('🔄 Usando Sequelize para obtener usuarios con wallet');
    const users = await User.findAll({
      include: [
        {
          model: Wallet,
          as: 'wallet',
          attributes: ['id', 'balance', 'currency'],
          required: false // Hacer el join LEFT para incluir usuarios sin wallet
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log(`✅ Se encontraron ${users.length} usuarios a través de Sequelize`);
    
    // Transformar para coincidir con lo que espera el frontend
    const transformedUsers = users.map(user => {
      const userData = user.get({ plain: true });
      return {
        id: userData.id,
        name: userData.fullName || '',
        email: userData.email,
        username: userData.username,
        role: userData.role || 'user',
        isActive: userData.isActive === undefined ? true : userData.isActive,
        createdAt: userData.createdAt,
        // Incluir otros campos que pueda necesitar el frontend
        wallet: userData.wallet
      };
    });
    
    console.log(`🔄 Datos transformados para ${transformedUsers.length} usuarios`);
    
    // Enviar datos en el formato exacto que espera el frontend
    res.status(200).json(transformedUsers);
  } catch (error) {
    console.error('❌ Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la lista de usuarios',
      error: error.message,
      stack: error.stack
    });
  }
};

/**
 * Obtener detalles de un usuario específico
 */
exports.getUserDetails = async (req, res) => {
  const { userId } = req.params;

  try {
    console.log(`🔍 Buscando detalles del usuario con ID: ${userId}`);
    
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Wallet,
          as: 'wallet',
          attributes: ['id', 'balance', 'currency']
        }
      ]
    });

    if (!user) {
      console.log(`❌ No se encontró el usuario con ID: ${userId}`);
      return res.status(404).json({
        success: false,
        message: `No se encontró el usuario con ID: ${userId}`
      });
    }

    console.log(`✅ Usuario encontrado: ${user.username}`);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error(`❌ Error al obtener detalles del usuario ${userId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener detalles del usuario',
      error: error.message
    });
  }
};

/**
 * Actualizar el rol o estado de un usuario
 */
exports.updateUser = async (req, res) => {
  const { userId } = req.params;
  const { role, isActive } = req.body;

  try {
    console.log(`🔄 Actualizando usuario con ID: ${userId}`);
    
    const user = await User.findByPk(userId);

    if (!user) {
      console.log(`❌ No se encontró el usuario con ID: ${userId}`);
      return res.status(404).json({
        success: false,
        message: `No se encontró el usuario con ID: ${userId}`
      });
    }

    // Actualizar solo los campos proporcionados
    const updates = {};
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;

    await user.update(updates);
    
    console.log(`✅ Usuario ${user.username} actualizado correctamente`);

    res.status(200).json({
      success: true,
      message: 'Usuario actualizado correctamente',
      data: user
    });
  } catch (error) {
    console.error(`❌ Error al actualizar el usuario ${userId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el usuario',
      error: error.message
    });
  }
};
