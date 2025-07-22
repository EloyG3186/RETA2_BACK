const jwt = require('jsonwebtoken');

function verifyJWTToken() {
  try {
    console.log('🔍 Verificando token JWT...');

    // Token del frontend (extraído de los logs)
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjkxZjcwOWNhLTM4MzAtNDg4Yy05MTY4LWZiZTViZDY4YmE5MCIsInVzZXJuYW1lIjoiRWxveUciLCJlbWFpbCI6ImVsb3kuZ29uemFsZXpqYTJAZ21haWwuY29tIiwiaWF0IjoxNzM3MzQ4NjQ5LCJleHAiOjE3Mzc0MzUwNDl9.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    
    console.log('🔑 Token completo:', token);
    console.log('📏 Longitud del token:', token.length);
    
    // Intentar decodificar sin verificar la firma primero
    const decoded = jwt.decode(token, { complete: true });
    
    if (!decoded) {
      console.error('❌ No se pudo decodificar el token');
      return;
    }
    
    console.log('📋 Header del token:', decoded.header);
    console.log('📋 Payload del token:', decoded.payload);
    
    // Verificar si el token está expirado
    const now = Math.floor(Date.now() / 1000);
    const exp = decoded.payload.exp;
    
    console.log('⏰ Timestamp actual:', now);
    console.log('⏰ Timestamp de expiración:', exp);
    console.log('⏰ ¿Token expirado?', now > exp);
    
    if (now > exp) {
      console.error('❌ El token está EXPIRADO');
      const expiredSince = now - exp;
      console.error(`⏰ Expirado hace ${expiredSince} segundos (${Math.floor(expiredSince / 3600)} horas)`);
    } else {
      console.log('✅ El token NO está expirado');
      const timeLeft = exp - now;
      console.log(`⏰ Tiempo restante: ${timeLeft} segundos (${Math.floor(timeLeft / 3600)} horas)`);
    }
    
    // Verificar el usuario ID
    console.log('👤 Usuario ID en token:', decoded.payload.id);
    console.log('👤 Username en token:', decoded.payload.username);
    console.log('📧 Email en token:', decoded.payload.email);
    
    // Verificar si el formato del token es correcto
    const parts = token.split('.');
    console.log('🔍 Partes del token:', parts.length);
    
    if (parts.length !== 3) {
      console.error('❌ Token malformado - debe tener 3 partes separadas por puntos');
    } else {
      console.log('✅ Token tiene el formato correcto (3 partes)');
    }
    
  } catch (error) {
    console.error('❌ Error al verificar token:', error.message);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verifyJWTToken();
  console.log('✅ Verificación completada');
}

module.exports = verifyJWTToken;
