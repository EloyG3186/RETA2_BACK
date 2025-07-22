const FriendNetwork = require('../models/mongodb/FriendNetwork');
const { User } = require('../models');

// Obtener la red de amigos del usuario
exports.getUserFriendNetwork = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Buscar la red de amigos del usuario
    let friendNetwork = await FriendNetwork.findOne({ userId });
    
    // Si no existe, crear una nueva
    if (!friendNetwork) {
      friendNetwork = new FriendNetwork({
        userId,
        friends: [],
        pendingRequests: [],
        sentRequests: [],
        blockedUsers: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await friendNetwork.save();
    }
    
    // Generar sugerencias de amigos
    const suggestions = await generateFriendSuggestions(userId, friendNetwork);
    
    return res.status(200).json({
      success: true,
      data: friendNetwork,
      suggestions: suggestions
    });
  } catch (error) {
    console.error('Error al obtener red de amigos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener red de amigos',
      error: error.message
    });
  }
};

// Función auxiliar para generar sugerencias de amigos
const generateFriendSuggestions = async (userId, friendNetwork) => {
  try {
    // Obtener IDs de usuarios que ya son amigos
    const friendIds = friendNetwork.friends
      .filter(friendship => friendship.status === 'active')
      .flatMap(friendship => friendship.users)
      .filter(id => id !== userId);
    
    // Obtener IDs de usuarios bloqueados
    const blockedIds = friendNetwork.blockedUsers || [];
    
    // Obtener IDs de solicitudes pendientes (enviadas y recibidas)
    const pendingIds = [
      ...friendNetwork.pendingRequests.filter(req => req.status === 'pending').map(req => req.from),
      ...friendNetwork.sentRequests.filter(req => req.status === 'pending').map(req => req.to)
    ];
    
    // Crear lista de IDs a excluir
    const excludeIds = [userId, ...friendIds, ...blockedIds, ...pendingIds];
    
    console.log(`🔍 [SUGERENCIAS] Usuario actual: ${userId}`);
    console.log(`🔍 [SUGERENCIAS] Amigos actuales: ${friendIds.length}`, friendIds);
    console.log(`🔍 [SUGERENCIAS] Usuarios bloqueados: ${blockedIds.length}`, blockedIds);
    console.log(`🔍 [SUGERENCIAS] Solicitudes pendientes: ${pendingIds.length}`, pendingIds);
    console.log(`🔍 [SUGERENCIAS] Total IDs a excluir: ${excludeIds.length}`, excludeIds);
    
    // Primero, contar todos los usuarios disponibles
    const totalUsers = await User.count();
    console.log(`🔍 [SUGERENCIAS] Total usuarios en BD: ${totalUsers}`);
    
    // Buscar usuarios que no están en la lista de exclusión
    const suggestedUsers = await User.findAll({
      where: {
        id: {
          [require('sequelize').Op.notIn]: excludeIds
        }
      },
      attributes: ['id', 'username', 'fullName', 'email', 'profilePicture'],
      limit: 5, // Limitar a 5 sugerencias
      order: [['createdAt', 'DESC']] // Usuarios más recientes primero
    });
    
    console.log(`🔍 [SUGERENCIAS] Usuarios encontrados para sugerir: ${suggestedUsers.length}`);
    if (suggestedUsers.length > 0) {
      console.log(`🔍 [SUGERENCIAS] Primeros usuarios:`, suggestedUsers.slice(0, 2).map(u => ({ id: u.id, name: u.fullName || u.username })));
    }
    
    // Formatear sugerencias
    const suggestions = suggestedUsers.map(user => ({
      id: user.id,
      name: user.fullName || user.username,
      username: user.username,
      avatar: user.profilePicture,
      mutualFriends: Math.floor(Math.random() * 3) // Simular amigos en común por ahora
    }));
    
    console.log(`💡 Generadas ${suggestions.length} sugerencias de amigos para usuario ${userId}`);
    return suggestions;
    
  } catch (error) {
    console.error('Error al generar sugerencias de amigos:', error);
    return []; // Devolver array vacío en caso de error
  }
};

// Enviar una solicitud de amistad
exports.sendFriendRequest = async (req, res) => {
  try {
    const { targetUserId, message } = req.body;
    const userId = req.user.id;
    
    // Verificar que el usuario objetivo existe
    const targetUser = await User.findByPk(targetUserId);
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario objetivo no encontrado'
      });
    }
    
    // Verificar que el usuario no está enviando una solicitud a sí mismo
    if (userId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'No puedes enviar una solicitud de amistad a ti mismo'
      });
    }
    
    // Obtener la red de amigos del usuario
    let senderNetwork = await FriendNetwork.findOne({ userId });
    
    // Si no existe, crear una nueva
    if (!senderNetwork) {
      senderNetwork = new FriendNetwork({
        userId,
        friends: [],
        pendingRequests: [],
        sentRequests: [],
        blockedUsers: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Verificar si ya son amigos
    const alreadyFriends = senderNetwork.friends.some(friendship => 
      friendship.users.includes(targetUserId) && friendship.status === 'active'
    );
    
    if (alreadyFriends) {
      return res.status(400).json({
        success: false,
        message: 'Ya son amigos'
      });
    }
    
    // Verificar si ya existe una solicitud pendiente enviada
    const existingSentRequest = senderNetwork.sentRequests.find(request => 
      request.to === targetUserId && request.status === 'pending'
    );
    
    if (existingSentRequest) {
      return res.status(400).json({
        success: false,
        message: 'Ya has enviado una solicitud de amistad a este usuario'
      });
    }
    
    // Obtener la red de amigos del usuario objetivo
    let targetNetwork = await FriendNetwork.findOne({ userId: targetUserId });
    
    // Si no existe, crear una nueva
    if (!targetNetwork) {
      targetNetwork = new FriendNetwork({
        userId: targetUserId,
        friends: [],
        pendingRequests: [],
        sentRequests: [],
        blockedUsers: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Verificar si el usuario está bloqueado por el objetivo
    if (targetNetwork.blockedUsers.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'No puedes enviar una solicitud a este usuario'
      });
    }
    
    // Verificar si ya existe una solicitud pendiente recibida
    const existingPendingRequest = targetNetwork.pendingRequests.find(request => 
      request.from === userId && request.status === 'pending'
    );
    
    if (existingPendingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una solicitud pendiente'
      });
    }
    
    // Crear la solicitud de amistad
    const friendRequest = {
      from: userId,
      to: targetUserId,
      status: 'pending',
      message: message || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Añadir la solicitud a ambas redes
    senderNetwork.sentRequests.push(friendRequest);
    targetNetwork.pendingRequests.push(friendRequest);
    
    senderNetwork.updatedAt = new Date();
    targetNetwork.updatedAt = new Date();
    
    await senderNetwork.save();
    await targetNetwork.save();
    
    return res.status(201).json({
      success: true,
      message: 'Solicitud de amistad enviada con éxito',
      data: friendRequest
    });
  } catch (error) {
    console.error('Error al enviar solicitud de amistad:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al enviar solicitud de amistad',
      error: error.message
    });
  }
};

// Responder a una solicitud de amistad
exports.respondToFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { accept } = req.body;
    const userId = req.user.id;
    
    // Obtener la red de amigos del usuario
    const userNetwork = await FriendNetwork.findOne({ userId });
    
    if (!userNetwork) {
      return res.status(404).json({
        success: false,
        message: 'Red de amigos no encontrada'
      });
    }
    
    // Buscar la solicitud pendiente
    const pendingRequestIndex = userNetwork.pendingRequests.findIndex(request => 
      request._id.toString() === requestId && request.status === 'pending'
    );
    
    if (pendingRequestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de amistad no encontrada'
      });
    }
    
    const pendingRequest = userNetwork.pendingRequests[pendingRequestIndex];
    const senderUserId = pendingRequest.from;
    
    // Obtener la red de amigos del remitente
    const senderNetwork = await FriendNetwork.findOne({ userId: senderUserId });
    
    if (!senderNetwork) {
      return res.status(404).json({
        success: false,
        message: 'Red de amigos del remitente no encontrada'
      });
    }
    
    // Buscar la solicitud enviada
    const sentRequestIndex = senderNetwork.sentRequests.findIndex(request => 
      request.to === userId && request.status === 'pending'
    );
    
    if (sentRequestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud enviada no encontrada'
      });
    }
    
    // Actualizar el estado de la solicitud en ambas redes
    const newStatus = accept ? 'accepted' : 'rejected';
    
    userNetwork.pendingRequests[pendingRequestIndex].status = newStatus;
    userNetwork.pendingRequests[pendingRequestIndex].updatedAt = new Date();
    
    senderNetwork.sentRequests[sentRequestIndex].status = newStatus;
    senderNetwork.sentRequests[sentRequestIndex].updatedAt = new Date();
    
    // Si se acepta, crear la amistad en ambas redes
    if (accept) {
      const friendship = {
        users: [userId, senderUserId],
        since: new Date(),
        status: 'active',
        lastInteraction: new Date(),
        challengesCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      userNetwork.friends.push(friendship);
      senderNetwork.friends.push(friendship);
    }
    
    userNetwork.updatedAt = new Date();
    senderNetwork.updatedAt = new Date();
    
    await userNetwork.save();
    await senderNetwork.save();
    
    return res.status(200).json({
      success: true,
      message: accept ? 'Solicitud de amistad aceptada' : 'Solicitud de amistad rechazada'
    });
  } catch (error) {
    console.error('Error al responder a solicitud de amistad:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al responder a solicitud de amistad',
      error: error.message
    });
  }
};

// Bloquear a un usuario
exports.blockUser = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const userId = req.user.id;
    
    // Verificar que el usuario objetivo existe
    const targetUser = await User.findByPk(targetUserId);
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario objetivo no encontrado'
      });
    }
    
    // Verificar que el usuario no está bloqueando a sí mismo
    if (userId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'No puedes bloquearte a ti mismo'
      });
    }
    
    // Obtener la red de amigos del usuario
    let userNetwork = await FriendNetwork.findOne({ userId });
    
    // Si no existe, crear una nueva
    if (!userNetwork) {
      userNetwork = new FriendNetwork({
        userId,
        friends: [],
        pendingRequests: [],
        sentRequests: [],
        blockedUsers: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Verificar si ya está bloqueado
    if (userNetwork.blockedUsers.includes(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Este usuario ya está bloqueado'
      });
    }
    
    // Eliminar cualquier amistad existente
    userNetwork.friends = userNetwork.friends.filter(friendship => 
      !friendship.users.includes(targetUserId)
    );
    
    // Eliminar cualquier solicitud pendiente
    userNetwork.pendingRequests = userNetwork.pendingRequests.filter(request => 
      request.from !== targetUserId
    );
    
    userNetwork.sentRequests = userNetwork.sentRequests.filter(request => 
      request.to !== targetUserId
    );
    
    // Añadir a la lista de bloqueados
    userNetwork.blockedUsers.push(targetUserId);
    userNetwork.updatedAt = new Date();
    
    await userNetwork.save();
    
    return res.status(200).json({
      success: true,
      message: 'Usuario bloqueado con éxito'
    });
  } catch (error) {
    console.error('Error al bloquear usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al bloquear usuario',
      error: error.message
    });
  }
};
