// listUsers.js
// Script para listar usuarios registrados

const { sequelize } = require('./src/config/database');

async function listUsers() {
  try {
    const [results] = await sequelize.query(`SELECT id, username, email, email_verified FROM users`);
    console.log('Usuarios registrados:');
    console.table(results);
    return results;
  } catch (error) {
    console.error('Error al consultar usuarios:', error);
    return [];
  } finally {
    await sequelize.close();
  }
}

// Ejecutar script
listUsers()
  .then(() => {
    console.log('¡Listado finalizado!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error en el proceso:', err);
    process.exit(1);
  });
