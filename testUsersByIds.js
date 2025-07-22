const axios = require('axios');

async function testUsersByIds() {
  try {
    // Datos del usuario de prueba
    const userData = {
      id: '91f709ca-3830-488c-9168-fbe5bd68ba90',
      username: 'EloyG',
      email: 'eloy.gonzalezja2@gmail.com',
      fullName: 'Eloy Gonzalez'
    };
    
    const userIds = [userData.id];
    
    console.log(' [TEST] Probando endpoint getUsersByIds...');
    console.log(' [TEST] IDs a probar:', userIds);
    console.log(' [TEST] Usuario esperado:', userData.username, '-', userData.fullName);
    
    // Obtener token con el email correcto
    console.log(' [TEST] Obteniendo token...');
    const loginResponse = await axios.get(`http://localhost:5001/api/users/dev-login/${userData.email}`);
    const token = loginResponse.data.token;
    
    console.log(' [TEST] Token obtenido:', token ? 'SÍ' : 'NO');
    
    // Probar el endpoint getUsersByIds
    console.log(' [TEST] Llamando a getUsersByIds...');
    const response = await axios.post('http://localhost:5001/api/users/by-ids', 
      { userIds },
      { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(' [TEST] Respuesta exitosa:', response.data);
    
    // Verificar que los datos son correctos
    if (response.data.success && response.data.data.length > 0) {
      const user = response.data.data[0];
      console.log(' [TEST] Usuario encontrado:');
      console.log('   - ID:', user.id);
      console.log('   - Username:', user.username);
      console.log('   - Full Name:', user.fullName);
      console.log('   - Email:', user.email);
      console.log('   - Avatar/ProfilePicture:', user.avatar || user.profilePicture);
      
      if (user.username === userData.username && user.fullName === userData.fullName) {
        console.log(' [TEST] ¡ÉXITO! Los datos coinciden perfectamente.');
      } else {
        console.log(' [TEST] Advertencia: Los datos no coinciden exactamente.');
      }
    }
    
  } catch (error) {
    console.error(' [TEST] Error en el test:', error.response?.data || error.message);
    console.error(' [TEST] Status:', error.response?.status);
    console.error(' [TEST] Headers:', error.response?.headers);
  }
}

testUsersByIds();
