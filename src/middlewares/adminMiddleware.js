const User = require('../models/User');

/**
 * Middleware para verificar si el usuario es administrador
 */
exports.isAdmin = async (req, res, next) => {
  try {
    console.log('[isAdmin] Verificando permisos de administrador...');
    console.log('[isAdmin] req.user:', req.user ? { id: req.user.id, role: req.user.role } : 'No hay usuario');
    
    // Verificamos que exista un usuario en el request (colocado por el authMiddleware)
    if (!req.user || !req.user.id) {
      console.error('[isAdmin] No hay objeto usuario en la solicitud');
      return res.status(401).json({ message: 'No autorizado - Usuario no encontrado en la solicitud' });
    }

    // Obtenemos el usuario completo de la base de datos para confirmar rol
    const user = await User.findByPk(req.user.id);
    console.log('[isAdmin] Usuario encontrado en DB:', user ? { id: user.id, username: user.username, role: user.role } : 'No encontrado');
    
    if (!user) {
      console.error('[isAdmin] Usuario no encontrado en la base de datos');
      return res.status(401).json({ message: 'Usuario no encontrado en la base de datos' });
    }

    // Verificamos que el usuario tenga rol de administrador
    if (user.role !== 'admin') {
      console.error('[isAdmin] El usuario no tiene rol de administrador. Rol actual:', user.role);
      return res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    // Si el usuario es administrador, continuamos
    console.log('[isAdmin] Usuario verificado como administrador:', user.username);
    next();
  } catch (error) {
    console.error('[isAdmin] Error en middleware de administrador:', error.message, error.stack);
    res.status(500).json({ message: 'Error interno del servidor: ' + error.message });
  }
};
