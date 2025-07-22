// makeAdminFixed.js
// Script para convertir un usuario en administrador

const { sequelize } = require('./src/config/database');

async function showTableStructure() {
  try {
    // Obtener estructura de la tabla users
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
    console.log("Estructura de la tabla users:");
    console.table(columns);
    return columns;
  } catch (error) {
    console.error('Error al obtener estructura:', error);
  }
}

async function makeAdmin(email) {
  try {
    // La columna probablemente sea 'role' en lugar de camelCase
    const [results] = await sequelize.query(`UPDATE users SET role = 'admin' WHERE email = '${email}'`);
    console.log(`Usuario ${email} actualizado a rol admin. Filas afectadas:`, results);
    
    // Verificamos el resultado
    const [userAfterUpdate] = await sequelize.query(`SELECT id, username, email, role FROM users WHERE email = '${email}'`);
    console.log("Usuario después de actualizar:", userAfterUpdate);
    
    return true;
  } catch (error) {
    console.error('Error al actualizar el usuario:', error);
    return false;
  } finally {
    // Cerrar la conexión
    await sequelize.close();
  }
}

// Primero mostramos la estructura de la tabla
showTableStructure()
  .then(() => makeAdmin('admin@example.com'))
  .then(() => {
    console.log('¡Proceso finalizado!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error en el proceso:', err);
    process.exit(1);
  });
