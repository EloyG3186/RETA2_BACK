// checkUserRole.js
// Script para verificar el rol de un usuario específico

const { User } = require('./src/models');
const jwt = require('jsonwebtoken');
const config = require('./src/config/config');

async function checkUserAndCreateToken() {
  try {
    // Buscar el usuario por email
    const user = await User.findOne({ 
      where: { email: 'admin@example.com' },
      raw: true  // Para obtener un objeto plano en lugar de una instancia Sequelize
    });
    
    if (!user) {
      console.error('Usuario no encontrado');
      return;
    }
    
    console.log('Información del usuario:');
    console.log('------------------------');
    console.log('ID:', user.id);
    console.log('Username:', user.username);
    console.log('Email:', user.email);
    console.log('Rol:', user.role);
    console.log('Activo:', user.is_active);
    console.log('Verificado:', user.email_verified);
    
    // Crear un nuevo token JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret_development_key', {
      expiresIn: '24h'
    });
    
    console.log('\nNuevo token JWT (cópialo para pruebas):');
    console.log(token);
    
    // Información para pruebas
    console.log('\nPara probar manualmente desde la consola:');
    console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:5001/api/users/me`);
    
    return {user, token};
  } catch (error) {
    console.error('Error al verificar usuario:', error);
  }
}

checkUserAndCreateToken()
  .then(() => {
    console.log('\nProceso finalizado!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error en el proceso:', err);
    process.exit(1);
  });
