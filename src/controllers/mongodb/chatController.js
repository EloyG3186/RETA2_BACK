const Chat = require('../../models/mongodb/Chat');

/**
 * Obtener todas las conversaciones de un usuario
 */
const getUserChats = async (req, res) => {
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
      message: 'Error al obtener los chats',
      error: error.message
    });
  }
};

/**
 * Obtener una conversación específica
 */
const getChatById = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    
    // Buscar la conversación
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Conversación no encontrada'
      });
    }
    
    // Verificar que el usuario sea participante
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
      message: 'Error al obtener la conversación',
      error: error.message
    });
  }
};

/**
 * Crear una nueva conversación
 */
const createChat = async (req, res) => {
  try {
    const { participants, isGroupChat, groupName } = req.body;
    const userId = req.user.id;
    
    // Asegurarse de que el creador esté incluido en los participantes
    if (!participants.includes(userId)) {
      participants.push(userId);
    }
    
    // Crear la nueva conversación
    const newChat = new Chat({
      participants,
      isGroupChat: isGroupChat || false,
      groupName: groupName || null,
      groupAdmin: isGroupChat ? userId : null,
      messages: []
    });
    
    await newChat.save();
    
    return res.status(201).json({
      success: true,
      data: newChat,
      message: 'Conversación creada exitosamente'
    });
  } catch (error) {
    console.error('Error al crear chat:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la conversación',
      error: error.message
    });
  }
};

/**
 * Enviar un mensaje a una conversación
 */
const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, attachments } = req.body;
    const userId = req.user.id;
    
    // Buscar la conversación
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Conversación no encontrada'
      });
    }
    
    // Verificar que el usuario sea participante
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
    
    // Agregar el mensaje a la conversación
    chat.messages.push(newMessage);
    chat.lastActivity = new Date();
    
    await chat.save();
    
    return res.status(201).json({
      success: true,
      data: newMessage,
      message: 'Mensaje enviado exitosamente'
    });
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al enviar el mensaje',
      error: error.message
    });
  }
};

/**
 * Marcar mensajes como leídos
 */
const markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    
    // Buscar la conversación
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Conversación no encontrada'
      });
    }
    
    // Verificar que el usuario sea participante
    if (!chat.participants.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para acceder a esta conversación'
      });
    }
    
    // Marcar como leídos los mensajes que no son del usuario
    let updated = false;
    chat.messages.forEach(message => {
      if (message.sender !== userId && !message.read) {
        message.read = true;
        updated = true;
      }
    });
    
    if (updated) {
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
      message: 'Error al marcar los mensajes como leídos',
      error: error.message
    });
  }
};

module.exports = {
  getUserChats,
  getChatById,
  createChat,
  sendMessage,
  markMessagesAsRead
};
