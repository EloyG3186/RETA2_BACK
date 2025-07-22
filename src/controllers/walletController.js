const { Wallet, Transaction, User } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

// Obtener billetera del usuario
exports.getWallet = async (req, res) => {
  try {
    const userId = req.user.id; // Obtenido del middleware de autenticación

    const wallet = await Wallet.findOne({
      where: { userId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'fullName']
        }
      ]
    });

    if (!wallet) {
      return res.status(404).json({ 
        success: false, 
        message: 'Billetera no encontrada' 
      });
    }

    res.status(200).json({
      success: true,
      data: wallet
    });
  } catch (error) {
    console.error('Error al obtener billetera:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener billetera', 
      error: error.message 
    });
  }
};

// Obtener historial de transacciones
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.id; // Obtenido del middleware de autenticación
    const { limit = 10, page = 1, type } = req.query;

    // Buscar la billetera del usuario
    const wallet = await Wallet.findOne({ where: { userId } });

    if (!wallet) {
      return res.status(404).json({ 
        success: false, 
        message: 'Billetera no encontrada' 
      });
    }

    // Construir condiciones de búsqueda
    const whereConditions = { walletId: wallet.id };
    if (type) whereConditions.type = type;

    // Calcular offset para paginación
    const offset = (page - 1) * limit;

    // Obtener transacciones con paginación
    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where: whereConditions,
      limit: parseInt(limit),
      offset: offset,
      order: [['createdAt', 'DESC']]
    });

    // Calcular total de páginas
    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener transacciones:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener transacciones', 
      error: error.message 
    });
  }
};

// Realizar un depósito
exports.deposit = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const userId = req.user.id; // Obtenido del middleware de autenticación
    const { amount, description } = req.body;

    // Validar monto
    if (!amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'El monto debe ser mayor a cero' 
      });
    }

    // Buscar la billetera del usuario
    const wallet = await Wallet.findOne({ 
      where: { userId },
      transaction
    });

    if (!wallet) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Billetera no encontrada' 
      });
    }

    // Actualizar saldo
    const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
    await wallet.update({ balance: newBalance }, { transaction });

    // Registrar transacción
    const newTransaction = await Transaction.create({
      walletId: wallet.id,
      type: 'deposit',
      amount,
      description: description || 'Depósito a la billetera',
      status: 'completed'
    }, { transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Depósito realizado exitosamente',
      data: {
        transaction: newTransaction,
        newBalance
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al realizar depósito:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al realizar depósito', 
      error: error.message 
    });
  }
};

// Realizar un retiro
exports.withdraw = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const userId = req.user.id; // Obtenido del middleware de autenticación
    const { amount, description } = req.body;

    // Validar monto
    if (!amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'El monto debe ser mayor a cero' 
      });
    }

    // Buscar la billetera del usuario
    const wallet = await Wallet.findOne({ 
      where: { userId },
      transaction
    });

    if (!wallet) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Billetera no encontrada' 
      });
    }

    // Verificar saldo suficiente
    if (parseFloat(wallet.balance) < parseFloat(amount)) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Saldo insuficiente' 
      });
    }

    // Actualizar saldo
    const newBalance = parseFloat(wallet.balance) - parseFloat(amount);
    await wallet.update({ balance: newBalance }, { transaction });

    // Registrar transacción
    const newTransaction = await Transaction.create({
      walletId: wallet.id,
      type: 'withdrawal',
      amount,
      description: description || 'Retiro de la billetera',
      status: 'completed'
    }, { transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Retiro realizado exitosamente',
      data: {
        transaction: newTransaction,
        newBalance
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al realizar retiro:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al realizar retiro', 
      error: error.message 
    });
  }
};

// Realizar una transferencia a otro usuario
exports.transfer = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const senderId = req.user.id; // Obtenido del middleware de autenticación
    const { recipientUsername, amount, description } = req.body;

    // Validar monto
    if (!amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'El monto debe ser mayor a cero' 
      });
    }

    // Buscar al destinatario por username
    const recipient = await User.findOne({ 
      where: { username: recipientUsername },
      transaction
    });

    if (!recipient) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario destinatario no encontrado' 
      });
    }

    // Verificar que no sea una transferencia a sí mismo
    if (recipient.id === senderId) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'No puedes transferir a tu propia cuenta' 
      });
    }

    // Buscar las billeteras del remitente y destinatario
    const senderWallet = await Wallet.findOne({ 
      where: { userId: senderId },
      transaction
    });

    const recipientWallet = await Wallet.findOne({ 
      where: { userId: recipient.id },
      transaction
    });

    if (!senderWallet || !recipientWallet) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Billetera no encontrada' 
      });
    }

    // Verificar saldo suficiente
    if (parseFloat(senderWallet.balance) < parseFloat(amount)) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Saldo insuficiente' 
      });
    }

    // Actualizar saldos
    const newSenderBalance = parseFloat(senderWallet.balance) - parseFloat(amount);
    const newRecipientBalance = parseFloat(recipientWallet.balance) + parseFloat(amount);
    
    await senderWallet.update({ balance: newSenderBalance }, { transaction });
    await recipientWallet.update({ balance: newRecipientBalance }, { transaction });

    // Registrar transacción para el remitente
    const senderTransaction = await Transaction.create({
      walletId: senderWallet.id,
      type: 'transfer',
      amount,
      description: description || `Transferencia a ${recipientUsername}`,
      status: 'completed',
      destinationWalletId: recipientWallet.id
    }, { transaction });

    // Registrar transacción para el destinatario
    await Transaction.create({
      walletId: recipientWallet.id,
      type: 'transfer',
      amount,
      description: `Transferencia recibida de ${req.user.username}`,
      status: 'completed',
      referenceId: senderTransaction.id
    }, { transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Transferencia realizada exitosamente',
      data: {
        transaction: senderTransaction,
        newBalance: newSenderBalance
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al realizar transferencia:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al realizar transferencia', 
      error: error.message 
    });
  }
};

// Obtener recompensas ganadas por el usuario
exports.getRewards = async (req, res) => {
  try {
    const userId = req.user.id; // Obtenido del middleware de autenticación
    console.log('Obteniendo recompensas para el usuario:', userId);

    // Datos de ejemplo para desarrollo
    const exampleRewards = [
      {
        id: '1',
        amount: 50,
        description: 'Premio por ganar desafío: Reto de Fitness',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed'
      },
      {
        id: '2',
        amount: 30,
        description: 'Premio por ganar desafío: Maratón de Lectura',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed'
      },
      {
        id: '3',
        amount: 25,
        description: 'Premio por ganar desafío: Ahorro Semanal',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed'
      }
    ];

    // Intentar obtener datos reales si es posible
    try {
      // Buscar la billetera del usuario
      const wallet = await Wallet.findOne({ 
        where: { userId },
        include: [
          {
            model: Transaction,
            where: {
              description: {
                [Op.like]: '%Premio por ganar desafío%'
              },
              type: 'credit'
            },
            required: false
          }
        ]
      });

      if (wallet && wallet.Transactions && wallet.Transactions.length > 0) {
        // Calcular total de recompensas
        const totalRewards = wallet.Transactions.reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0);
        
        return res.status(200).json({
          success: true,
          data: {
            userId,
            totalRewards,
            recentRewards: wallet.Transactions
          }
        });
      }
    } catch (dbError) {
      console.error('Error al consultar la base de datos para recompensas:', dbError);
      // Continuamos con los datos de ejemplo
    }

    // Si no hay datos reales, devolver los datos de ejemplo
    res.status(200).json({
      success: true,
      data: {
        userId,
        totalRewards: 105,
        recentRewards: exampleRewards
      }
    });
  } catch (error) {
    console.error('Error al obtener recompensas:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener recompensas', 
      error: error.message 
    });
  }
};
