const Chat = require('../models/mongodb/Chat');

// Obtener todas las conversaciones del usuario
exports.getUserChats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Buscar todas las conversaciones donde el usuario es participante
    const chats = await Chat.find({
      participants: userId
    }).sort({ lastActivity: -1 });
    
    return res.status(200).json({
      success: true,
      data: chats
    });
  } catch (error) {
    console.error('Error al obtener chats del usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener chats',
      error: error.message
    });
  }
};

// Obtener una conversación específica
exports.getChatById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Buscar la conversación
    const chat = await Chat.findById(id);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Conversación no encontrada'
      });
    }
    
    // Verificar que el usuario es participante
    if (!chat.participants.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para acceder a esta conversación'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('Error al obtener chat:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener chat',
      error: error.message
    });
  }
};

// Crear una nueva conversación
exports.createChat = async (req, res) => {
  try {
    const { participants, isGroupChat, groupName } = req.body;
    const userId = req.user.id;
    
    // Asegurarse de que el usuario actual esté incluido en los participantes
    if (!participants.includes(userId)) {
      participants.push(userId);
    }
    
    // Crear la nueva conversación
    const newChat = new Chat({
      participants,
      isGroupChat: isGroupChat || false,
      groupName: isGroupChat ? groupName : undefined,
      groupAdmin: isGroupChat ? userId : undefined,
      messages: [],
      lastActivity: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newChat.save();
    
    return res.status(201).json({
      success: true,
      message: 'Conversación creada con éxito',
      data: newChat
    });
  } catch (error) {
    console.error('Error al crear chat:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear chat',
      error: error.message
    });
  }
};

// Enviar un mensaje a una conversación
exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, attachments } = req.body;
    const userId = req.user.id;
    
    // Buscar la conversación
    const chat = await Chat.findById(id);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Conversación no encontrada'
      });
    }
    
    // Verificar que el usuario es participante
    if (!chat.participants.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para enviar mensajes en esta conversación'
      });
    }
    
    // Crear el nuevo mensaje
    const newMessage = {
      sender: userId,
      content,
      timestamp: new Date(),
      read: false,
      attachments: attachments || []
    };
    
    // Añadir el mensaje a la conversación
    chat.messages.push(newMessage);
    chat.lastActivity = new Date();
    chat.updatedAt = new Date();
    
    await chat.save();
    
    return res.status(201).json({
      success: true,
      message: 'Mensaje enviado con éxito',
      data: newMessage
    });
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al enviar mensaje',
      error: error.message
    });
  }
};

// Marcar mensajes como leídos
exports.markMessagesAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Buscar la conversación
    const chat = await Chat.findById(id);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Conversación no encontrada'
      });
    }
    
    // Verificar que el usuario es participante
    if (!chat.participants.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para acceder a esta conversación'
      });
    }
    
    // Marcar como leídos todos los mensajes que no son del usuario
    let updated = false;
    chat.messages.forEach(message => {
      if (message.sender !== userId && !message.read) {
        message.read = true;
        updated = true;
      }
    });
    
    if (updated) {
      chat.updatedAt = new Date();
      await chat.save();
    }
    
    return res.status(200).json({
      success: true,
      message: 'Mensajes marcados como leídos'
    });
  } catch (error) {
    console.error('Error al marcar mensajes como leídos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al marcar mensajes como leídos',
      error: error.message
    });
  }
};
