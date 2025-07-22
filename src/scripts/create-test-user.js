const { User, UserPoints } = require('../models');

async function createTestUser() {
  try {
    console.log('👤 Creando usuario de prueba para gamificación...');
    
    const testUserId = '11111111-1111-1111-1111-111111111111';
    
    // Verificar si el usuario ya existe
    let user = await User.findByPk(testUserId);
    
    if (!user) {
      // Crear el usuario de prueba
      user = await User.create({
        id: testUserId,
        username: 'usuario_prueba',
        email: 'test@example.com',
        password: 'password123', // Campo requerido
        fullName: 'Usuario de Prueba', // Campo requerido
        isActive: true,
        emailVerified: true
      });
      console.log('✅ Usuario de prueba creado:', user.email);
    } else {
      console.log('✅ Usuario de prueba ya existe:', user.email);
    }
    
    // Verificar/crear puntos para el usuario
    let userPoints = await UserPoints.findOne({
      where: { userId: testUserId }
    });
    
    if (!userPoints) {
      userPoints = await UserPoints.create({
        userId: testUserId,
        total: 150,
        level: 3
      });
      console.log('✅ Puntos de prueba creados: 150 puntos, nivel 3');
    } else {
      console.log('✅ Puntos de usuario ya existen:', userPoints.total, 'puntos, nivel', userPoints.level);
    }
    
    console.log('🎯 Usuario de prueba listo para gamificación');
    
  } catch (error) {
    console.error('❌ Error al crear usuario de prueba:', error.message);
    throw error;
  }
}

module.exports = createTestUser;

if (require.main === module) {
  createTestUser()
    .then(() => {
      console.log('✅ Proceso completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}
