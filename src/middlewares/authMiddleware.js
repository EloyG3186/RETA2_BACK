const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Middleware para verificar el token JWT
exports.authenticate = async (req, res, next) => {
  try {
    // Obtener el token del header
    const authHeader = req.headers.authorization;
    console.log('Headers de autenticación recibidos:', req.headers);
    console.log('Auth header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Acceso sin token de autorización válido');
      // En desarrollo, crear un usuario de prueba para permitir acceso a las APIs
      req.user = {
        id: '0b4cb600-e339-4aa6-bdac-8ec24f73f112', // ID del juez EloyG5 para pruebas
        username: 'EloyG5',
        email: 'eloy.gonzalezja5@gmail.com',
        isActive: true
      };
      console.log('Usuario de prueba creado:', req.user);
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    console.log('Token extraído:', token.substring(0, 15) + '...');
    
    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_development_key');
    console.log('Token decodificado correctamente. ID de usuario:', decoded.id);
    
    // Buscar el usuario
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      console.warn('Usuario no encontrado en la base de datos a pesar de tener un token válido');
      // En desarrollo, crear un usuario de prueba para permitir acceso a las APIs
      req.user = {
        id: '0b4cb600-e339-4aa6-bdac-8ec24f73f112', // ID del juez EloyG5 para pruebas
        username: 'EloyG5',
        email: 'eloy.gonzalezja5@gmail.com',
        isActive: true
      };
      console.log('Usuario de prueba creado:', req.user);
      return next();
    }
    
    // Verificar si el usuario está activo
    if (!user.isActive) {
      console.log('Usuario desactivado:', user.username);
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario desactivado. Contacte al administrador' 
      });
    }
    
    // Asignar el usuario al request para su uso en rutas protegidas
    req.user = user;
    console.log('Usuario autenticado con éxito:', {
      id: user.id,
      username: user.username,
      role: user.role
    });
    next();
  } catch (error) {
    console.error('Error de autenticación:', error.message, error.stack);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      console.warn('Token inválido. En modo desarrollo, permitiendo acceso con usuario de prueba.');
      // En desarrollo, crear un usuario de prueba para permitir acceso a las APIs
      req.user = {
        id: '0b4cb600-e339-4aa6-bdac-8ec24f73f112', // ID del juez EloyG5 para pruebas
        username: 'EloyG5',
        email: 'eloy.gonzalezja5@gmail.com',
        isActive: true
      };
      return next();
    }
    
    return res.status(500).json({
      success: false,
      message: 'Error en la autenticación',
      error: error.message
    });
  }
};

// Middleware para verificar roles
exports.authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Acceso no autorizado' 
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permiso para acceder a este recurso' 
      });
    }
    
    next();
  };
};

// Middleware para verificar si el usuario es administrador
exports.isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Acceso no autorizado' 
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Se requieren permisos de administrador para esta acción' 
    });
  }
  
  next();
};
