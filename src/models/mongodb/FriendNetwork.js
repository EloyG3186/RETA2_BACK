const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Esquema para solicitudes de amistad
const FriendRequestSchema = new Schema({
  from: {
    type: String, // UUID de PostgreSQL
    required: true
  },
  to: {
    type: String, // UUID de PostgreSQL
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  message: {
    type: String,
    default: ''
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

// Esquema para relaciones de amistad
const FriendshipSchema = new Schema({
  users: [{
    type: String, // UUID de PostgreSQL
    required: true
  }],
  since: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'blocked'],
    default: 'active'
  },
  lastInteraction: {
    type: Date,
    default: Date.now
  },
  challengesCount: {
    type: Number,
    default: 0
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

// Esquema para la red de amigos de un usuario
const FriendNetworkSchema = new Schema({
  userId: {
    type: String, // UUID de PostgreSQL
    required: true,
    unique: true,
    index: true // Añadir índice para mejorar búsquedas por userId
  },
  friends: [{
    users: [{
      type: String, // UUID de PostgreSQL
      required: true
    }],
    status: {
      type: String,
      enum: ['active', 'blocked'],
      default: 'active'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  pendingRequests: [{
    type: Schema.Types.ObjectId,
    ref: 'FriendRequest'
  }],
  sentRequests: [{
    type: Schema.Types.ObjectId,
    ref: 'FriendRequest'
  }],
  blockedUsers: [{
    type: String, // UUID de PostgreSQL
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true // Añadir índice para búsquedas por fecha
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Opciones del esquema para optimizar rendimiento
  timestamps: true, // Gestiona automáticamente createdAt y updatedAt
  autoIndex: true, // Asegura que los índices se creen automáticamente
  bufferTimeoutMS: 30000 // Aumentar el timeout para operaciones de buffer
});

// Middleware para actualizar updatedAt
FriendRequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

FriendshipSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

FriendNetworkSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Crear índices compuestos para mejorar consultas comunes
FriendRequestSchema.index({ from: 1, to: 1 }); // Índice compuesto para búsquedas por from y to
FriendRequestSchema.index({ status: 1 }); // Índice para búsquedas por estado

FriendshipSchema.index({ users: 1 }); // Índice para búsquedas por usuarios
FriendshipSchema.index({ status: 1 }); // Índice para búsquedas por estado

// Crear índice para userId en FriendNetwork (aunque ya está definido como índice en el esquema)
FriendNetworkSchema.index({ userId: 1 }, { unique: true });

// Exportar modelos
const FriendRequest = mongoose.model('FriendRequest', FriendRequestSchema);
const Friendship = mongoose.model('Friendship', FriendshipSchema);
const FriendNetwork = mongoose.model('FriendNetwork', FriendNetworkSchema);

// Función para crear índices manualmente si es necesario
const createIndexes = async () => {
  try {
    console.log('Creando índices para colecciones de red social...');
    await FriendNetwork.createIndexes();
    await FriendRequest.createIndexes();
    await Friendship.createIndexes();
    console.log('Índices creados correctamente.');
  } catch (error) {
    console.error('Error al crear índices:', error);
  }
};

// Ejecutar creación de índices
createIndexes();

module.exports = { FriendRequest, Friendship, FriendNetwork };
