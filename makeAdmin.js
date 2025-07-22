// makeAdmin.js
// Script para convertir un usuario en administrador

const { sequelize } = require('./src/config/database');

async function makeAdmin(email) {
  try {
    const [results] = await sequelize.query(`UPDATE users SET role = 'admin' WHERE email = '${email}'`);
    console.log(`Usuario ${email} actualizado a rol admin. Filas afectadas:`, results);
    return true;
  } catch (error) {
    console.error('Error al actualizar el usuario:', error);
    return false;
  } finally {
    // Cerrar la conexión
    await sequelize.close();
  }
}

// Usuario a convertir en administrador
makeAdmin('admin@example.com')
  .then(() => {
    console.log('¡Proceso finalizado!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error en el proceso:', err);
    process.exit(1);
  });
