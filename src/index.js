console.log('🚀 Iniciando aplicación Challenge Friends Backend...');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./config/database');
const { connectMongoDB } = require('./config/mongodb');
const config = require('./config/config');
const userRoutes = require('./routes/userRoutes');
const challengeRoutes = require('./routes/challengeRoutes');
const walletRoutes = require('./routes/walletRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const evidenceRoutes = require('./routes/evidenceRoutes');
const statsRoutes = require('./routes/statsRoutes');
const judgeRoutes = require('./routes/judgeRoutes');
const chatRoutes = require('./routes/chatRoutes');
const communityRoutes = require('./routes/communityRoutes');
const testimonialRoutes = require('./routes/testimonialRoutes');
const friendNetworkRoutes = require('./routes/friendNetworkRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const gamificationRoutes = require('./routes/gamificationRoutes');
const enrichedCommentRoutes = require('./routes/enrichedCommentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const testRoutes = require('./routes/testRoutes'); // Ruta para pruebas
const avatarRoutes = require('./routes/avatarRoutes'); // Nuevas rutas para avatares
const diagnosticRoutes = require('./routes/diagnosticRoutes'); // Rutas de diagnóstico para avatares
const uploadRoutes = require('./routes/uploadRoutes'); // Rutas generales de upload
const activityRoutes = require('./routes/activityRoutes'); // Rutas de actividad del usuario
const dashboardRoutes = require('./routes/dashboardRoutes'); // Rutas del dashboard
const accountDeletionRoutes = require('./routes/accountDeletionRoutes'); // Rutas de eliminación de cuenta
const { setupChallengeCronJobs } = require('./cron/challengeCron');
const { setupActivitySummaryCronJobs } = require('./cron/activitySummaryCron');
const { setupAccountDeletionCronJobs } = require('./cron/accountDeletionCron');

// Importar todos los modelos para asegurar que se registren correctamente
const models = require('./models');

// Importar y configurar las asociaciones entre modelos
const { setupAssociations } = require('./models/associations');

// Inicializar la aplicación Express
const app = express();
const PORT = config.server.port;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'public'
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Rutas PostgreSQL (transaccionales)
app.use('/api/users', userRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/evidences', evidenceRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/judge', judgeRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/rewards', require('./routes/rewards')); // Rutas de recompensas
app.use('/api/admin', adminRoutes); // Rutas de administración

// Rutas para gestión de avatares
app.use('/api/avatars', avatarRoutes);

// Rutas generales de upload
app.use('/api/upload', uploadRoutes);

// Rutas MongoDB (sociales)
app.use('/api/chats', chatRoutes);
app.use('/api/messages', require('./routes/messageRoutes')); // Rutas de mensajes (alias para chats)
app.use('/api/communities', communityRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/friends', friendNetworkRoutes);
app.use('/api/comments', enrichedCommentRoutes);

// Rutas de notificaciones
app.use('/api/notifications', notificationRoutes);

// Rutas de actividad del usuario
app.use('/api/activity', activityRoutes);

// Rutas de eliminación y recuperación de cuenta
app.use('/api/account-deletion', accountDeletionRoutes);

// Rutas de prueba (sin autenticación para facilitar debug)
app.use('/test', testRoutes);

// Rutas de diagnóstico para depurar problemas con avatares
app.use('/diagnostic', diagnosticRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API de Challenge Friends funcionando correctamente');
});

// Función para iniciar el servidor
const startServer = () => {
  // Crear servidor HTTP
  const server = http.createServer(app);
  
  // Configurar Socket.IO
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });
  
  // Configurar eventos de Socket.IO
  io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado a Socket.IO:', socket.id);
    
    // Autenticación del socket
    const token = socket.handshake.auth.token;
    if (token) {
      // Aquí puedes verificar el token JWT si es necesario
      console.log('🔐 Socket autenticado con token');
    }
    
    // Manejar desconexión
    socket.on('disconnect', (reason) => {
      console.log('🔌 Cliente desconectado:', socket.id, 'Razón:', reason);
    });
    
    // Ejemplo de evento personalizado
    socket.on('join_room', (room) => {
      socket.join(room);
      console.log(`🏠 Socket ${socket.id} se unió a la sala: ${room}`);
    });
  });
  
  // Hacer io accesible globalmente para otros módulos
  global.io = io;
  
  // Iniciar el servidor
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor ejecutándose en el puerto ${PORT}`);
    console.log(`🌐 API disponible en: http://localhost:${PORT}`);
    console.log('🔌 Socket.IO configurado y listo');
    console.log('🔄 Servidor listo para recibir peticiones');
  });
  
  // Configurar tareas programadas
  setupChallengeCronJobs();
  setupActivitySummaryCronJobs();
  setupAccountDeletionCronJobs();
  
  // Manejo de cierre graceful
  process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor...');
    server.close(() => {
      console.log('✅ Servidor cerrado correctamente');
      process.exit(0);
    });
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Señal SIGTERM recibida, cerrando servidor...');
    server.close(() => {
      console.log('✅ Servidor cerrado correctamente');
      process.exit(0);
    });
  });
  
  return server;
};

// Conectar a PostgreSQL y MongoDB
const initializeDatabases = async () => {
  try {
    // Configurar asociaciones entre modelos con manejo de errores
    try {
      setupAssociations();
      console.log('✅ Asociaciones entre modelos configuradas');
    } catch (assocError) {
      console.warn('⚠️ Error en asociaciones:', assocError.message);
      console.warn('Continuando sin asociaciones...');
    }
    
    // Sincronizar modelos con PostgreSQL
    await sequelize.sync({ force: false });
    console.log('✅ Base de datos PostgreSQL sincronizada correctamente');
    
    // Conectar a MongoDB
    const mongoConnected = await connectMongoDB();
    if (mongoConnected) {
      console.log('✅ Conexión a MongoDB establecida correctamente');
    } else {
      console.warn('⚠️ No se pudo conectar a MongoDB. Las funcionalidades sociales pueden no estar disponibles.');
    }
    
    // Iniciar el servidor después de conectar a las bases de datos
    startServer();
  } catch (err) {
    console.error('❌ Error al inicializar las bases de datos:', err);
    process.exit(1);
  }
};

// Iniciar la aplicación
// Capturar errores no manejados para evitar cierres inesperados
process.on('uncaughtException', (err) => {
  console.error('❌ Error no manejado:', err);
  console.log('⚠️ El servidor continuará funcionando...');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  console.log('⚠️ El servidor continuará funcionando...');
});

initializeDatabases();
