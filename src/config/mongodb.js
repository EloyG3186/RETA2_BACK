const mongoose = require('mongoose');
require('dotenv').config();

// URL de conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/challenge_friends_social';

// Configuración de conexión a MongoDB
const connectMongoDB = async () => {
  try {
    // Opciones mejoradas de conexión para evitar timeouts
    const mongooseOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      socketTimeoutMS: 30000, // Aumentar a 30 segundos (default: 10000)
      connectTimeoutMS: 30000, // Aumentar el tiempo de conexión inicial
      serverSelectionTimeoutMS: 30000, // Tiempo de selección del servidor
      heartbeatFrequencyMS: 5000, // Frecuencia de heartbeat más rápida
      maxPoolSize: 10, // Tamaño máximo del pool de conexiones
      minPoolSize: 2, // Tamaño mínimo del pool de conexiones
      retryWrites: true, // Reintentar escrituras automáticamente
      // Configuración de reintentos automáticos
      retryReads: true // Reintentar lecturas automáticamente
    };

    await mongoose.connect(MONGODB_URI, mongooseOptions);
    console.log('Conexión a MongoDB establecida correctamente.');
    
    // Configurar eventos para monitorear la conexión
    mongoose.connection.on('error', (err) => {
      console.error('Error en la conexión de MongoDB:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB desconectado. Intentando reconectar...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('Reconexión a MongoDB exitosa');
    });
    
    return true;
  } catch (error) {
    console.error('Error al conectar a MongoDB:', error);
    return false;
  }
};

module.exports = { mongoose, connectMongoDB };
