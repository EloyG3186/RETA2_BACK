const { Wallet, Transaction, User, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Otorgar premio al ganador de un desafío
 * @param {string} userId - ID del usuario ganador
 * @param {number} amount - Cantidad del premio
 * @param {Object} transaction - Transacción de Sequelize
 * @returns {Promise<Object>} - Resultado de la operación
 */
exports.awardPrize = async (userId, amount, transaction) => {
  try {
    // Verificar que el usuario exista
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error(`Usuario con ID ${userId} no encontrado`);
    }

    // Buscar o crear la billetera del usuario
    let wallet = await Wallet.findOne({ where: { userId } });
    
    if (!wallet) {
      wallet = await Wallet.create({
        userId,
        balance: 0,
        currency: 'USD' // Moneda predeterminada
      }, { transaction });
    }

    // Actualizar el saldo de la billetera
    wallet.balance += amount;
    await wallet.save({ transaction });

    // Registrar la transacción
    await Transaction.create({
      walletId: wallet.id,
      amount,
      type: 'credit',
      description: 'Premio por ganar desafío',
      status: 'completed',
      timestamp: new Date()
    }, { transaction });

    return {
      success: true,
      message: `Premio de ${amount} otorgado exitosamente al usuario ${userId}`,
      data: {
        userId,
        newBalance: wallet.balance,
        awardedAmount: amount
      }
    };
  } catch (error) {
    console.error('Error al otorgar premio:', error);
    throw error;
  }
};

/**
 * Obtener el saldo de la billetera de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} - Información de la billetera
 */
exports.getWalletBalance = async (userId) => {
  try {
    // Buscar la billetera del usuario
    let wallet = await Wallet.findOne({ 
      where: { userId },
      include: [{
        model: Transaction,
        limit: 10,
        order: [['timestamp', 'DESC']]
      }]
    });
    
    // Si no existe, crear una billetera con saldo cero
    if (!wallet) {
      wallet = await Wallet.create({
        userId,
        balance: 0,
        currency: 'USD'
      });
    }

    return {
      success: true,
      data: {
        walletId: wallet.id,
        balance: wallet.balance,
        currency: wallet.currency,
        recentTransactions: wallet.Transactions || []
      }
    };
  } catch (error) {
    console.error('Error al obtener saldo de billetera:', error);
    throw error;
  }
};

/**
 * Retirar fondos de la billetera de un usuario
 * @param {string} userId - ID del usuario
 * @param {number} amount - Cantidad a retirar
 * @returns {Promise<Object>} - Resultado de la operación
 */
exports.withdrawFunds = async (userId, amount) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Buscar la billetera del usuario
    const wallet = await Wallet.findOne({ where: { userId } });
    
    if (!wallet) {
      await transaction.rollback();
      throw new Error(`Billetera no encontrada para el usuario ${userId}`);
    }
    
    // Verificar que haya saldo suficiente
    if (wallet.balance < amount) {
      await transaction.rollback();
      throw new Error('Saldo insuficiente para realizar el retiro');
    }
    
    // Actualizar el saldo
    wallet.balance -= amount;
    await wallet.save({ transaction });
    
    // Registrar la transacción
    await Transaction.create({
      walletId: wallet.id,
      amount: -amount, // Valor negativo para retiros
      type: 'debit',
      description: 'Retiro de fondos',
      status: 'completed',
      timestamp: new Date()
    }, { transaction });
    
    await transaction.commit();
    
    return {
      success: true,
      message: 'Retiro procesado correctamente',
      data: {
        userId,
        newBalance: wallet.balance,
        withdrawnAmount: amount
      }
    };
  } catch (error) {
    await transaction.rollback();
    console.error('Error al procesar retiro:', error);
    throw error;
  }
};
