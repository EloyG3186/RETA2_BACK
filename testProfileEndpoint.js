// Script para probar directamente el endpoint /profile
const axios = require('axios');

async function testProfileEndpoint() {
  try {
    // Obtener token del localStorage (simulado, tendrás que ingresar un token válido aquí)
    const token = process.argv[2] || 'tu-token-jwt-aqui';
    
    if (!token || token === 'tu-token-jwt-aqui') {
      console.error('Por favor proporciona un token JWT como argumento:');
      console.error('node testProfileEndpoint.js TU_TOKEN_JWT');
      return;
    }
    
    console.log('Probando endpoint /profile con el token JWT proporcionado...');
    
    // Llamar al endpoint /profile
    const response = await axios.get('http://localhost:5001/api/profile', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('Respuesta del endpoint /profile:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Análisis detallado de la respuesta
    if (response.data && response.data.data) {
      const userData = response.data.data;
      console.log('\nDatos del usuario:');
      console.log('ID:', userData.id);
      console.log('Username:', userData.username);
      console.log('Email:', userData.email);
      console.log('Role:', userData.role);
      console.log('isActive:', userData.isActive);
      console.log('emailVerified:', userData.emailVerified);
      
      // Verificar la condición exacta que usamos en AdminRoute.tsx
      const isAdmin = userData && userData.role === 'admin';
      console.log('\nLa condición userData.role === "admin" devuelve:', isAdmin);
    } else {
      console.log('La respuesta no contiene datos de usuario en el formato esperado.');
    }
    
  } catch (error) {
    console.error('Error al probar el endpoint:', error.message);
    if (error.response) {
      console.error('Detalles de error:', error.response.status, error.response.statusText);
      console.error('Datos de respuesta:', error.response.data);
    }
  }
}

testProfileEndpoint();
