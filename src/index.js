console.log('🚀 Iniciando aplicación Challenge Friends Backend...');
const express = require('express');
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
const { setupChallengeCronJobs } = require('./cron/challengeCron');
const { setupActivitySummaryCronJobs } = require('./cron/activitySummaryCron');

// Importar todos los modelos para asegurar que se registren correctamente
const models = require('./models');

// Importar y configurar las asociaciones entre modelos
const { setupAssociations } = require('./models/associations');

// Inicializar la aplicación Express
const app = express();
const PORT = config.server.port;

// Middleware
app.use(cors());
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
app.use('/api/communities', communityRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/friends', friendNetworkRoutes);
app.use('/api/comments', enrichedCommentRoutes);

// Rutas de notificaciones
app.use('/api/notifications', notificationRoutes);

// Rutas de actividad del usuario
app.use('/api/activity', activityRoutes);

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
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
  });
  
  // Configurar tareas programadas
  setupChallengeCronJobs();
  setupActivitySummaryCronJobs();
};

// Conectar a PostgreSQL y MongoDB
const initializeDatabases = async () => {
  console.log('🔄 Entrando a initializeDatabases...');
  try {
    console.log('🔄 Iniciando configuración de asociaciones...');
    // Configurar asociaciones entre modelos
    console.log('🔄 Configurando asociaciones de modelos...');
    setupAssociations();
    console.log('✅ Asociaciones entre modelos configuradas');
    
    // Sincronizar modelos con PostgreSQL
    console.log('🔄 Sincronizando base de datos PostgreSQL...');
    // Temporalmente deshabilitamos alter para evitar conflictos de restricciones
    await sequelize.sync({ force: false });
    console.log('✅ Base de datos PostgreSQL sincronizada correctamente');
    
    // Conectar a MongoDB
    console.log('🔄 Conectando a MongoDB...');
    const mongoConnected = await connectMongoDB();
    if (mongoConnected) {
      console.log('✅ Conexión a MongoDB establecida correctamente');
    } else {
      console.warn('⚠️ No se pudo conectar a MongoDB. Las funcionalidades sociales pueden no estar disponibles.');
    }
    
    // Iniciar el servidor después de conectar a las bases de datos
    console.log('🚀 Iniciando servidor...');
    startServer();
    console.log('✅ Servidor iniciado correctamente');
  } catch (err) {
    console.error('❌ Error al inicializar las bases de datos:', err);
    process.exit(1);
  }
};

// Iniciar la aplicación
console.log('🔄 Iniciando proceso de inicialización...');
initializeDatabases();
console.log('✅ Proceso de inicialización completado');
