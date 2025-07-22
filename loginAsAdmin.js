// Script para iniciar sesión como admin y obtener un token JWT
const axios = require('axios');

async function loginAsAdmin() {
  try {
    console.log('Intentando iniciar sesión como administrador...');
    
    const loginResponse = await axios.post('http://localhost:5001/api/login', {
      email: 'admin@example.com',
      password: 'admin123' // Asumiendo que esta es la contraseña, modifícala si es diferente
    });
    
    if (loginResponse.data && loginResponse.data.token) {
      console.log('\n¡Inicio de sesión exitoso!');
      console.log('\nToken JWT obtenido:');
      console.log(loginResponse.data.token);
      
      // Con este token, probaremos el endpoint de perfil
      console.log('\nProbando el endpoint de perfil con este token...');
      
      const profileResponse = await axios.get('http://localhost:5001/api/profile', {
        headers: {
          Authorization: `Bearer ${loginResponse.data.token}`
        }
      });
      
      console.log('\nRespuesta del endpoint /profile:');
      console.log(JSON.stringify(profileResponse.data, null, 2));
      
      // Verificar el rol
      const userData = profileResponse.data.data;
      console.log('\nRol del usuario:', userData.role);
      console.log('¿Es administrador?', userData.role === 'admin');
      
      return loginResponse.data.token;
    } else {
      console.error('No se pudo obtener el token JWT');
      console.log('Respuesta completa:', loginResponse.data);
    }
  } catch (error) {
    console.error('Error al iniciar sesión:', error.message);
    if (error.response) {
      console.error('Detalles de error:', error.response.status, error.response.statusText);
      console.error('Datos de respuesta:', error.response.data);
    }
  }
}

loginAsAdmin();
