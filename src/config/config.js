/**
 * Configuraciones generales de la aplicaciu00f3n
 */

// Cargar variables de entorno
require('dotenv').config();

const config = {
  // Configuraciones del servidor
  server: {
    port: 5001, // Forzamos el uso del puerto 5001 para evitar conflictos
    env: process.env.NODE_ENV || 'development'
  },
  
  // Configuraciones de email
  email: {
    from: process.env.EMAIL_FROM || '"Challenge Friends" <noreply@challengefriends.com>',
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    // Configuraciones para entorno de desarrollo (pruebas)
    test: {
      host: process.env.TEST_EMAIL_HOST || 'smtp.ethereal.email',
      port: process.env.TEST_EMAIL_PORT || 587,
      auth: {
        user: process.env.TEST_EMAIL_USER,
        pass: process.env.TEST_EMAIL_PASSWORD
      }
    }
  },
  
  // Configuraciones de la aplicaciu00f3n frontend
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000'
  },
  
  // Configuraciones de JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'challenge-friends-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  }
};

module.exports = config;
