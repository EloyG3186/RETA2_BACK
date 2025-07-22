const { FriendNetwork, FriendRequest, Friendship } = require('../../models/mongodb/FriendNetwork');
const { User } = require('../../models'); // Corregido: importación directa del modelo User de PostgreSQL
const { Op } = require('sequelize');

/**
 * Función auxiliar para reintentar operaciones de MongoDB
 * @param {Function} operation - Función a ejecutar
 * @param {number} maxRetries - Número máximo de reintentos
 * @param {number} delay - Retraso entre reintentos en ms
 */
const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Intento ${attempt}/${maxRetries} fallido:`, error.message);
      lastError = error;
      
      // Si no es el último intento, esperar antes de reintentar
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt)); // Backoff exponencial
      }
    }
  }
  
  // Si llegamos aquí, todos los intentos fallaron
  throw lastError;
};

/**
 * Generar sugerencias de amigos para un usuario
 * @param {string} userId - ID del usuario
 * @param {Array} friendIds - IDs de amigos actuales
 * @param {Array} blockedIds - IDs de usuarios bloqueados
 * @param {Array} pendingRequestIds - IDs de usuarios con solicitudes pendientes
 * @param {Array} sentRequestIds - IDs de usuarios a los que se envió solicitud
 * @returns {Promise<Array>} Lista de sugerencias de amigos
 */
const generateFriendSuggestions = async (userId, friendIds, blockedIds, pendingRequestIds, sentRequestIds) => {
  try {
    console.log(`Generando sugerencias de amigos para usuario ${userId}`);
    
    // 1. Obtener amigos de amigos (2do grado de conexión)
    const friendsOfFriends = new Set();
    
    // Obtener las redes de amigos de los amigos del usuario
    const friendNetworks = await FriendNetwork.find({
      userId: { $in: friendIds }
    }).lean();
    
    // Extraer los amigos de cada amigo
    for (const network of friendNetworks) {
      if (network.friends && network.friends.length > 0) {
        for (const friendship of network.friends) {
          // Si es un objeto de amistad, extraer los usuarios
          if (friendship.users) {
            friendship.users.forEach(id => {
              // No incluir al usuario actual ni a sus amigos actuales
              if (id !== userId && !friendIds.includes(id)) {
                friendsOfFriends.add(id);
              }
            });
          }
        }
      }
    }
    
    // 2. Buscar usuarios activos que no sean amigos, no estén bloqueados,
    // y no tengan solicitudes pendientes
    const excludedIds = [
      userId,
      ...friendIds,
      ...blockedIds,
      ...pendingRequestIds,
      ...sentRequestIds
    ];
    
    // Primero intentar con amigos de amigos
    let potentialFriends = [];
    if (friendsOfFriends.size > 0) {
      const friendsOfFriendsArray = Array.from(friendsOfFriends);
      
      // Excluir los IDs que ya están en la lista de exclusión
      const filteredFriendsOfFriends = friendsOfFriendsArray.filter(
        id => !excludedIds.includes(id)
      );
      
      if (filteredFriendsOfFriends.length > 0) {
        // Buscar información de estos usuarios
        potentialFriends = await User.findAll({
          where: {
            id: { [Op.in]: filteredFriendsOfFriends },
            isActive: true
          },
          attributes: ['id', 'username', 'fullName', 'profilePicture'],
          limit: 10
        });
      }
    }
    
    // Si no hay suficientes amigos de amigos, buscar otros usuarios activos
    const suggestionLimit = 5;
    if (potentialFriends.length < suggestionLimit) {
      const additionalUsersNeeded = suggestionLimit - potentialFriends.length;
      
      // Buscar usuarios activos que no estén en la lista de exclusión
      const additionalUsers = await User.findAll({
        where: {
          id: { [Op.notIn]: excludedIds },
          isActive: true
        },
        attributes: ['id', 'username', 'fullName', 'profilePicture'],
        order: [['createdAt', 'DESC']],
        limit: additionalUsersNeeded
      });
      
      // Combinar resultados
      potentialFriends = [...potentialFriends, ...additionalUsers];
    }
    
    // 3. Procesar las sugerencias para incluir información relevante
    const suggestions = await Promise.all(potentialFriends.map(async (user) => {
      // Calcular amigos en común
      const mutualFriends = await calculateMutualFriends(userId, user.id);
      
      // Construir URL completa para el avatar
      let avatarUrl = null;
      if (user.profilePicture) {
        // Si es una URL completa, usarla tal como está
        if (user.profilePicture.startsWith('http://') || user.profilePicture.startsWith('https://')) {
          avatarUrl = user.profilePicture;
        } else {
          // Si es una ruta relativa, construir URL completa
          avatarUrl = `http://localhost:5001/uploads/avatars/${user.profilePicture}`;
        }
      }
      
      return {
        id: user.id,
        username: user.username,
        name: user.fullName || user.username,
        avatar: avatarUrl,
        mutualFriends: mutualFriends.length,
        mutualFriendsList: mutualFriends.slice(0, 3) // Limitar a 3 para no sobrecargar la respuesta
      };
    }));
    
    return suggestions;
  } catch (error) {
    console.error('Error generando sugerencias de amigos:', error);
    return [];
  }
};

/**
 * Calcular amigos en común entre dos usuarios
 * @param {string} userId1 - ID del primer usuario
 * @param {string} userId2 - ID del segundo usuario
 * @returns {Promise<Array>} Lista de amigos en común
 */
const calculateMutualFriends = async (userId1, userId2) => {
  try {
    // Obtener redes de amigos de ambos usuarios
    const [network1, network2] = await Promise.all([
      FriendNetwork.findOne({ userId: userId1 }).lean(),
      FriendNetwork.findOne({ userId: userId2 }).lean()
    ]);
    
    if (!network1 || !network2) return [];
    
    // Extraer IDs de amigos del primer usuario
    const friendIds1 = new Set();
    if (network1.friends && network1.friends.length > 0) {
      network1.friends.forEach(friendship => {
        if (friendship.users) {
          friendship.users.forEach(id => {
            if (id !== userId1) friendIds1.add(id);
          });
        }
      });
    }
    
    // Extraer IDs de amigos del segundo usuario y encontrar intersección
    const mutualFriends = [];
    if (network2.friends && network2.friends.length > 0) {
      network2.friends.forEach(friendship => {
        if (friendship.users) {
          friendship.users.forEach(id => {
            if (id !== userId2 && friendIds1.has(id)) {
              mutualFriends.push(id);
            }
          });
        }
      });
    }
    
    return mutualFriends;
  } catch (error) {
    console.error('Error calculando amigos en común:', error);
    return [];
  }
};

/**
 * Obtener la red de amigos de un usuario
 */
const getUserFriendNetwork = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`Obteniendo red de amigos para usuario: ${userId}`);
    
    // Usar la función de reintento para la operación de MongoDB
    const friendNetwork = await retryOperation(async () => {
      // Optimizar la consulta usando lean() para mejorar rendimiento
      let network = await FriendNetwork.findOne({ userId })
        .populate('friends')
        .populate('pendingRequests')
        .populate('sentRequests')
        .lean();
      
      if (!network) {
        console.log(`Creando nueva red de amigos para usuario: ${userId}`);
        const newNetwork = new FriendNetwork({
          userId,
          friends: [],
          pendingRequests: [],
          sentRequests: [],
          blockedUsers: []
        });
        network = await newNetwork.save();
      }
      
      return network;
    }, 3, 1000); // 3 reintentos, 1000ms de retraso inicial
    
    // Extraer IDs de amigos, usuarios bloqueados y solicitudes para generar sugerencias
    const friendIds = [];
    const blockedIds = friendNetwork.blockedUsers || [];
    const pendingRequestIds = [];
    const sentRequestIds = [];
    
    // Extraer IDs de amigos
    if (friendNetwork.friends && friendNetwork.friends.length > 0) {
      friendNetwork.friends.forEach(friendship => {
        if (friendship.users) {
          friendship.users.forEach(id => {
            if (id !== userId) friendIds.push(id);
          });
        }
      });
    }
    
    // Extraer IDs de solicitudes pendientes y enviadas
    if (friendNetwork.pendingRequests && friendNetwork.pendingRequests.length > 0) {
      friendNetwork.pendingRequests.forEach(request => {
        pendingRequestIds.push(request.from);
      });
    }
    
    if (friendNetwork.sentRequests && friendNetwork.sentRequests.length > 0) {
      friendNetwork.sentRequests.forEach(request => {
        sentRequestIds.push(request.to);
      });
    }
    
    // Generar sugerencias de amigos
    const suggestions = await generateFriendSuggestions(
      userId, 
      friendIds, 
      blockedIds, 
      pendingRequestIds, 
      sentRequestIds
    );
    
    console.log(`Red de amigos obtenida exitosamente para usuario: ${userId}`);
    return res.status(200).json({
      success: true,
      data: friendNetwork,
      suggestions: suggestions
    });
  } catch (error) {
    console.error(`Error al obtener red de amigos para usuario ${req.user.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la red de amigos',
      error: error.message
    });
  }
};

/**
 * Enviar una solicitud de amistad
 */
const sendFriendRequest = async (req, res) => {
  try {
    const { targetUserId, message } = req.body;
    const userId = req.user.id;
    
    // Verificar que no se envíe solicitud a sí mismo
    if (targetUserId === userId) {
      return res.status(400).json({
        success: false,
        message: 'No puedes enviarte una solicitud de amistad a ti mismo'
      });
    }
    
    // Buscar o crear la red de amigos del usuario
    let senderNetwork = await FriendNetwork.findOne({ userId });
    if (!senderNetwork) {
      senderNetwork = new FriendNetwork({
        userId,
        friends: [],
        pendingRequests: [],
        sentRequests: [],
        blockedUsers: []
      });
      await senderNetwork.save();
    }
    
    // Verificar si el usuario está bloqueado
    if (senderNetwork.blockedUsers.includes(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Has bloqueado a este usuario'
      });
    }
    
    // Buscar o crear la red de amigos del destinatario
    let receiverNetwork = await FriendNetwork.findOne({ userId: targetUserId });
    if (!receiverNetwork) {
      receiverNetwork = new FriendNetwork({
        userId: targetUserId,
        friends: [],
        pendingRequests: [],
        sentRequests: [],
        blockedUsers: []
      });
      await receiverNetwork.save();
    }
    
    // Verificar si el destinatario ha bloqueado al remitente
    if (receiverNetwork.blockedUsers.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'No puedes enviar solicitud a este usuario'
      });
    }
    
    // Verificar si ya son amigos
    const alreadyFriends = senderNetwork.friends.some(friendship => {
      return friendship.users && friendship.users.includes(targetUserId);
    });
    
    if (alreadyFriends) {
      return res.status(400).json({
        success: false,
        message: 'Ya son amigos'
      });
    }
    
    // Verificar si ya existe una solicitud pendiente
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { from: userId, to: targetUserId, status: 'pending' },
        { from: targetUserId, to: userId, status: 'pending' }
      ]
    });
    
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una solicitud de amistad pendiente'
      });
    }
    
    // Crear la solicitud de amistad
    const newRequest = new FriendRequest({
      from: userId,
      to: targetUserId,
      message: message || '',
      status: 'pending'
    });
    
    await newRequest.save();
    
    // Actualizar las redes de amigos
    senderNetwork.sentRequests.push(newRequest._id);
    receiverNetwork.pendingRequests.push(newRequest._id);
    
    await senderNetwork.save();
    await receiverNetwork.save();
    
    return res.status(201).json({
      success: true,
      data: newRequest,
      message: 'Solicitud de amistad enviada exitosamente'
    });
  } catch (error) {
    console.error('Error al enviar solicitud de amistad:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al enviar la solicitud de amistad',
      error: error.message
    });
  }
};

/**
 * Responder a una solicitud de amistad
 */
const respondToFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { accept } = req.body;
    const userId = req.user.id;
    
    // Buscar la solicitud
    const request = await FriendRequest.findById(requestId);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }
    
    // Verificar que la solicitud sea para este usuario
    if (request.to !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para responder a esta solicitud'
      });
    }
    
    // Verificar que la solicitud esté pendiente
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Esta solicitud ya ha sido respondida'
      });
    }
    
    // Actualizar el estado de la solicitud
    request.status = accept ? 'accepted' : 'rejected';
    await request.save();
    
    // Buscar las redes de amigos
    const senderNetwork = await FriendNetwork.findOne({ userId: request.from });
    const receiverNetwork = await FriendNetwork.findOne({ userId: request.to });
    
    // Eliminar la solicitud de las listas pendientes
    if (senderNetwork) {
      senderNetwork.sentRequests = senderNetwork.sentRequests.filter(
        req => req.toString() !== requestId
      );
      await senderNetwork.save();
    }
    
    if (receiverNetwork) {
      receiverNetwork.pendingRequests = receiverNetwork.pendingRequests.filter(
        req => req.toString() !== requestId
      );
      await receiverNetwork.save();
    }
    
    // Si se aceptó la solicitud, crear la amistad
    if (accept) {
      const newFriendship = new Friendship({
        users: [request.from, request.to],
        since: new Date(),
        status: 'active'
      });
      
      await newFriendship.save();
      
      // Actualizar las redes de amigos
      if (senderNetwork) {
        senderNetwork.friends.push(newFriendship._id);
        await senderNetwork.save();
      }
      
      if (receiverNetwork) {
        receiverNetwork.friends.push(newFriendship._id);
        await receiverNetwork.save();
      }
      
      return res.status(200).json({
        success: true,
        data: newFriendship,
        message: 'Solicitud de amistad aceptada'
      });
    } else {
      return res.status(200).json({
        success: true,
        message: 'Solicitud de amistad rechazada'
      });
    }
  } catch (error) {
    console.error('Error al responder a solicitud de amistad:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al responder a la solicitud de amistad',
      error: error.message
    });
  }
};

/**
 * Bloquear a un usuario
 */
const blockUser = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const userId = req.user.id;
    
    // Verificar que no se bloquee a sí mismo
    if (targetUserId === userId) {
      return res.status(400).json({
        success: false,
        message: 'No puedes bloquearte a ti mismo'
      });
    }
    
    // Buscar o crear la red de amigos del usuario
    let friendNetwork = await FriendNetwork.findOne({ userId });
    if (!friendNetwork) {
      friendNetwork = new FriendNetwork({
        userId,
        friends: [],
        pendingRequests: [],
        sentRequests: [],
        blockedUsers: []
      });
    }
    
    // Verificar si ya está bloqueado
    if (friendNetwork.blockedUsers.includes(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Este usuario ya está bloqueado'
      });
    }
    
    // Agregar a la lista de bloqueados
    friendNetwork.blockedUsers.push(targetUserId);
    
    // Eliminar cualquier amistad existente
    const existingFriendships = await Friendship.find({
      users: { $all: [userId, targetUserId] }
    });
    
    for (const friendship of existingFriendships) {
      friendship.status = 'blocked';
      await friendship.save();
      
      // Eliminar de la lista de amigos
      friendNetwork.friends = friendNetwork.friends.filter(
        f => f.toString() !== friendship._id.toString()
      );
    }
    
    // Eliminar solicitudes pendientes
    const pendingRequests = await FriendRequest.find({
      $or: [
        { from: userId, to: targetUserId, status: 'pending' },
        { from: targetUserId, to: userId, status: 'pending' }
      ]
    });
    
    for (const request of pendingRequests) {
      request.status = 'rejected';
      await request.save();
      
      // Eliminar de las listas de solicitudes
      friendNetwork.sentRequests = friendNetwork.sentRequests.filter(
        r => r.toString() !== request._id.toString()
      );
      
      friendNetwork.pendingRequests = friendNetwork.pendingRequests.filter(
        r => r.toString() !== request._id.toString()
      );
    }
    
    await friendNetwork.save();
    
    return res.status(200).json({
      success: true,
      message: 'Usuario bloqueado exitosamente'
    });
  } catch (error) {
    console.error('Error al bloquear usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al bloquear al usuario',
      error: error.message
    });
  }
};

module.exports = {
  getUserFriendNetwork,
  sendFriendRequest,
  respondToFriendRequest,
  blockUser,
  // Exportar funciones auxiliares para pruebas
  generateFriendSuggestions,
  calculateMutualFriends
};
