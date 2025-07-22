const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definimos un esquema para las reacciones como un objeto con arrays de IDs de usuario
const ReactionsObjectSchema = new Schema({
  like: {
    type: [String],
    default: []
  },
  love: {
    type: [String],
    default: []
  },
  haha: {
    type: [String],
    default: []
  },
  wow: {
    type: [String],
    default: []
  },
  sad: {
    type: [String],
    default: []
  },
  angry: {
    type: [String],
    default: []
  },
  support: {
    type: [String],
    default: []
  }
});

// Esquema para las menciones en los comentarios
const MentionSchema = new Schema({
  userId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  startIndex: {
    type: Number,
    required: true
  },
  endIndex: {
    type: Number,
    required: true
  }
});

// Esquema para el formato de texto enriquecido
const FormatSchema = new Schema({
  type: {
    type: String,
    enum: ['bold', 'italic', 'underline', 'code', 'link'],
    required: true
  },
  startIndex: {
    type: Number,
    required: true
  },
  endIndex: {
    type: Number,
    required: true
  },
  url: { // Solo para el tipo 'link'
    type: String,
    required: function() {
      return this.type === 'link';
    }
  }
});

// Esquema principal para los comentarios enriquecidos
const EnrichedCommentSchema = new Schema({
  // Referencia al ID del usuario en PostgreSQL
  userId: {
    type: String,
    required: true,
    index: true
  },
  // Información básica del usuario para evitar consultas adicionales
  user: {
    username: String,
    fullName: String,
    profilePicture: String
  },
  // Tipo de entidad a la que pertenece el comentario (challenge, post, etc.)
  entityType: {
    type: String,
    required: true,
    enum: ['challenge', 'post', 'community', 'evidence'],
    index: true
  },
  // ID de la entidad a la que pertenece el comentario
  entityId: {
    type: String,
    required: true,
    index: true
  },
  // Contenido del comentario
  content: {
    type: String,
    required: true
  },
  // Formato enriquecido (negrita, cursiva, etc.)
  formats: [FormatSchema],
  // Menciones a otros usuarios
  mentions: [MentionSchema],
  // Reacciones al comentario (objeto con arrays de IDs de usuario)
  reactions: {
    type: ReactionsObjectSchema,
    default: {
      like: [],
      love: [],
      haha: [],
      wow: [],
      sad: [],
      angry: [],
      support: []
    }
  },
  // ID del comentario padre (para hilos de comentarios)
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'EnrichedComment',
    default: null
  },
  // Nivel de anidación del comentario
  level: {
    type: Number,
    default: 0,
    min: 0,
    max: 3 // Limitamos a 3 niveles de anidación para evitar problemas de rendimiento
  },
  // Contador de respuestas para acceso rápido
  replyCount: {
    type: Number,
    default: 0
  },
  // Indica si el comentario ha sido editado
  isEdited: {
    type: Boolean,
    default: false
  },
  // Indica si el comentario ha sido eliminado (soft delete)
  isDeleted: {
    type: Boolean,
    default: false
  },
  // ID único generado por el cliente para evitar duplicados (idempotencia)
  clientId: {
    type: String,
    sparse: true,
    index: true
  }
}, {
  timestamps: true
});

// Índices compuestos para consultas frecuentes
EnrichedCommentSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
EnrichedCommentSchema.index({ parentId: 1, createdAt: 1 });

// Método para convertir menciones de texto a objetos de mención
EnrichedCommentSchema.statics.parseMentions = function(content) {
  const mentionRegex = /@([\w.-]+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push({
      username: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }
  
  return mentions;
};

// Método para agregar una reacción a un comentario
EnrichedCommentSchema.methods.addReaction = async function(userId, type) {
  // Verificar si el usuario ya ha reaccionado con este tipo
  const hasReactedWithType = this.reactions[type].includes(userId);
  
  if (hasReactedWithType) {
    return false; // El usuario ya ha reaccionado con este tipo
  }
  
  // Eliminar cualquier reacción previa del usuario de otros tipos
  const validReactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'support'];
  let previousType = null;
  
  for (const reactionType of validReactionTypes) {
    const index = this.reactions[reactionType].indexOf(userId);
    if (index !== -1) {
      previousType = reactionType;
      // Eliminar la reacción anterior
      this.reactions[reactionType].splice(index, 1);
      break;
    }
  }
  
  // Agregar la nueva reacción
  this.reactions[type].push(userId);
  
  // Guardar el comentario actualizado
  return await this.save();
};

// Método para eliminar una reacción de un comentario
EnrichedCommentSchema.methods.removeReaction = async function(userId) {
  // Verificar si el usuario ha reaccionado con algún tipo
  const validReactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'support'];
  let hasReacted = false;
  let reactionType = null;
  
  for (const type of validReactionTypes) {
    const index = this.reactions[type].indexOf(userId);
    if (index !== -1) {
      hasReacted = true;
      reactionType = type;
      // Eliminar la reacción
      this.reactions[type].splice(index, 1);
      break;
    }
  }
  
  if (!hasReacted) {
    return false; // El usuario no ha reaccionado
  }
  
  // Guardar el comentario actualizado
  return await this.save();
};

// Método para incrementar el contador de respuestas
EnrichedCommentSchema.methods.incrementReplyCount = async function() {
  this.replyCount += 1;
  return await this.save();
};

// Método para decrementar el contador de respuestas
EnrichedCommentSchema.methods.decrementReplyCount = async function() {
  if (this.replyCount > 0) {
    this.replyCount -= 1;
    return await this.save();
  }
  return this;
};

const EnrichedComment = mongoose.model('EnrichedComment', EnrichedCommentSchema);

module.exports = EnrichedComment;
