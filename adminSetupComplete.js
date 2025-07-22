// Script completo para configurar un usuario administrador funcional
const bcrypt = require('bcrypt');
const { sequelize } = require('./src/config/database');
const { User } = require('./src/models');

async function setupAdminUser() {
  try {
    console.log('Iniciando configuración completa de usuario administrador...');
    
    // Configuración del usuario admin
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123'; // Contraseña simple para pruebas
    const adminUsername = 'admin123';
    
    // Verificar si ya existe
    const existingUser = await User.findOne({ 
      where: { email: adminEmail },
      raw: true
    });
    
    if (existingUser) {
      console.log('El usuario administrador ya existe:', existingUser.email);
      
      // Actualizar a rol admin si no lo es
      if (existingUser.role !== 'admin') {
        await sequelize.query(`UPDATE users SET role = 'admin' WHERE email = '${adminEmail}'`);
        console.log('Usuario actualizado a rol admin');
      } else {
        console.log('El usuario ya tiene rol admin');
      }
      
      // Verificar email si no está verificado
      if (!existingUser.email_verified) {
        await sequelize.query(`UPDATE users SET email_verified = true WHERE email = '${adminEmail}'`);
        console.log('Email verificado correctamente');
      } else {
        console.log('El email ya estaba verificado');
      }
      
      // Actualizar contraseña para pruebas
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      await sequelize.query(`UPDATE users SET password = '${hashedPassword}' WHERE email = '${adminEmail}'`);
      console.log('Contraseña actualizada para pruebas');
      
    } else {
      // Crear nuevo usuario administrador
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      
      await sequelize.query(`
        INSERT INTO users (
          id, username, email, password, full_name, profile_picture, 
          is_active, role, email_verified, created_at, updated_at
        ) VALUES (
          uuid_generate_v4(), '${adminUsername}', '${adminEmail}', '${hashedPassword}', 
          'Administrador', 'default-profile.png', true, 'admin', true, 
          NOW(), NOW()
        )
      `);
      console.log('Nuevo usuario administrador creado');
    }
    
    // Verificar datos actuales
    const verifyUser = await User.findOne({ 
      where: { email: adminEmail },
      raw: true
    });
    
    console.log('\n✅ DATOS FINALES DEL USUARIO ADMINISTRADOR:');
    console.log('----------------------------------------');
    console.log('ID:', verifyUser.id);
    console.log('Username:', verifyUser.username);
    console.log('Email:', verifyUser.email);
    console.log('Rol:', verifyUser.role);
    console.log('Email verificado:', verifyUser.email_verified);
    console.log('Activo:', verifyUser.is_active);
    console.log('\n✅ CREDENCIALES PARA INICIAR SESIÓN:');
    console.log('Email: admin@example.com');
    console.log('Contraseña: admin123');
    console.log('\n✅ TODO CONFIGURADO CORRECTAMENTE');
    
    return verifyUser;
  } catch (error) {
    console.error('Error en la configuración del usuario administrador:', error);
    throw error;
  }
}

// Ejecutar la configuración
setupAdminUser()
  .then(() => {
    console.log('\nProceso completado exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nError durante el proceso:', error);
    process.exit(1);
  });
