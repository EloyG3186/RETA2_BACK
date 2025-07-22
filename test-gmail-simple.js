require('dotenv').config();
const nodemailer = require('nodemailer');

// Funciones para mostrar información legible en la consola
const log = (msg) => console.log(`\n📧 ${msg}`);
const success = (msg) => console.log(`\n✅ ${msg}`);
const error = (msg, err) => console.error(`\n❌ ${msg}`, err || '');

// Mostrar variables configuradas
log('CONFIGURACIÓN ACTUAL:');
console.log('- TEST_EMAIL_HOST:', process.env.TEST_EMAIL_HOST || 'No configurado');
console.log('- TEST_EMAIL_PORT:', process.env.TEST_EMAIL_PORT || 'No configurado');
console.log('- TEST_EMAIL_USER:', process.env.TEST_EMAIL_USER || 'No configurado');
console.log('- TEST_EMAIL_PASSWORD:', process.env.TEST_EMAIL_PASSWORD ? '[CONFIGURADO]' : 'No configurado');
console.log('- EMAIL_FROM:', process.env.EMAIL_FROM || 'No configurado');

async function testEmailConnection() {
  log('INICIANDO PRUEBA DE CONEXIÓN SMTP');
  
  try {
    // Crear transporter con las credenciales de Gmail
    log('Creando transporter...');
    const transporter = nodemailer.createTransport({
      host: process.env.TEST_EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.TEST_EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.TEST_EMAIL_USER,
        pass: process.env.TEST_EMAIL_PASSWORD
      },
      requireTLS: true,
      debug: true // Mostrar logs detallados
    });
    
    // Verificar conexión SMTP
    log('Verificando conexión al servidor SMTP...');
    await transporter.verify();
    success('CONEXIÓN ESTABLECIDA con el servidor SMTP');
    
    // Enviar email de prueba
    const recipient = process.env.TEST_EMAIL_USER; // Enviar al mismo correo
    log(`Enviando correo de prueba a ${recipient}...`);
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"RETA2" <${process.env.TEST_EMAIL_USER}>`,
      to: recipient,
      subject: 'Prueba de configuración SMTP ✅',
      text: 'Si estás viendo este mensaje, la configuración SMTP funciona correctamente.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4F46E5;">Prueba de configuración SMTP exitosa</h2>
          <p>Si estás viendo este mensaje, la configuración SMTP funciona correctamente.</p>
          <p>Detalles de la configuración:</p>
          <ul>
            <li>Host: ${process.env.TEST_EMAIL_HOST || 'smtp.gmail.com'}</li>
            <li>Puerto: ${process.env.TEST_EMAIL_PORT || '587'}</li>
            <li>Usuario: ${process.env.TEST_EMAIL_USER}</li>
            <li>Fecha/Hora: ${new Date().toLocaleString()}</li>
          </ul>
          <div style="margin-top: 30px; padding: 15px; background-color: #f0f4ff; border-left: 4px solid #4F46E5;">
            <p>Este es un correo generado automáticamente por el sistema de verificación de SMTP.</p>
          </div>
        </div>
      `
    });
    
    success('CORREO ENVIADO EXITOSAMENTE');
    console.log('- ID del mensaje:', info.messageId);
    console.log('- Aceptado por:', info.accepted);
    console.log('- Respuesta del servidor:', info.response);
    
    return { success: true, messageId: info.messageId };
  } catch (err) {
    error('ERROR AL ENVIAR CORREO', err);
    console.error('Detalles completos del error:', err);
    return { success: false, error: err };
  }
}

// Ejecutar prueba y mostrar resultado
testEmailConnection()
  .then(result => {
    if (result.success) {
      success('PRUEBA COMPLETA: La configuración de Gmail funciona correctamente.');
    } else {
      error('PRUEBA FALLIDA: No se pudo enviar el correo de prueba.');
    }
  });
