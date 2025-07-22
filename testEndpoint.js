// Script para probar el endpoint /users/me y ver la respuesta exacta
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { User } = require('./src/models');

async function testEndpoint() {
  try {
    // Buscar el usuario admin
    const user = await User.findOne({ 
      where: { email: 'admin@example.com' },
      raw: true
    });
    
    if (!user) {
      console.error('Usuario no encontrado');
      return;
    }
    
    // Crear token para el usuario
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret_development_key', {
      expiresIn: '1h'
    });
    
    console.log('Usuario encontrado en la DB:');
    console.log(JSON.stringify(user, null, 2));
    
    // Llamar al endpoint /users/me
    const response = await axios.get('http://localhost:5001/api/users/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    // Mostrar la respuesta completa
    console.log('\nRespuesta del endpoint /users/me:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Comprobar específicamente el campo role
    console.log('\nValor del campo role:', response.data.data.role);
    
    // Verificar si la condición usada en el frontend funcionaría
    const userData = response.data.data;
    const isAdmin = userData && userData.role === 'admin';
    console.log('\n¿Se cumpliría la condición en el frontend?', isAdmin);
    console.log('El tipo de userData.role es:', typeof userData.role);
    
  } catch (error) {
    console.error('Error al probar el endpoint:', error.message);
    if (error.response) {
      console.error('Respuesta de error:', error.response.data);
    }
  }
}

testEndpoint();
