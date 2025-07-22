const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Esquema para mensajes individuales
const MessageSchema = new Schema({
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  },
  attachments: [{
    type: String,
    url: String,
    contentType: String
  }]
});

// Esquema para conversaciones de chat
const ChatSchema = new Schema({
  participants: [{
    type: String, // UUID de PostgreSQL
    required: true
  }],
  messages: [MessageSchema],
  isGroupChat: {
    type: Boolean,
    default: false
  },
  groupName: {
    type: String,
    default: null
  },
  groupAdmin: {
    type: String, // UUID de PostgreSQL
    default: null
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para actualizar lastActivity y updatedAt
ChatSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  this.lastActivity = Date.now();
  next();
});

module.exports = mongoose.model('Chat', ChatSchema);
