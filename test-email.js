/**
 * Script de prueba para verificar la configuración de correo con Gmail
 */
require('dotenv').config();
const nodemailer = require('nodemailer');

// Mostrar las variables de entorno (sin mostrar la contraseña completa)
console.log('=== CONFIGURACIÓN DE CORREO ===');
console.log(`HOST: ${process.env.TEST_EMAIL_HOST}`);
console.log(`PUERTO: ${process.env.TEST_EMAIL_PORT}`);
console.log(`USUARIO: ${process.env.TEST_EMAIL_USER}`);
console.log(`CONTRASEÑA: ${process.env.TEST_EMAIL_PASSWORD ? '********' : 'NO CONFIGURADA'}`);
console.log(`FROM: ${process.env.EMAIL_FROM}`);
console.log('==============================\n');

async function testEmail() {
  try {
    console.log('🔍 Creando transporter con las credenciales de Gmail...');
    
    // Crear transporter con las credenciales de Gmail
    const transporter = nodemailer.createTransport({
      host: process.env.TEST_EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.TEST_EMAIL_PORT) || 587,
      secure: false, // Para el puerto 587, debe ser false
      auth: {
        user: process.env.TEST_EMAIL_USER,
        pass: process.env.TEST_EMAIL_PASSWORD
      },
      requireTLS: true, // Forzar uso de TLS
    });
    
    console.log('✅ Transporter creado. Verificando conexión...');
    
    // Verificar conexión
    await transporter.verify();
    console.log('✅ Conexión al servidor SMTP verificada exitosamente!');
    
    // Crear contenido del correo
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Prueba de Configuración de Correo</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Prueba de Correo de RETA2</h1>
        </div>
        
        <div class="content">
          <p>Este es un correo de prueba para verificar la configuración de Gmail en la aplicación.</p>
          <p>Si estás viendo este correo, significa que la configuración funciona correctamente.</p>
          
          <p><strong>Detalles de la configuración:</strong></p>
          <ul>
            <li>HOST: ${process.env.TEST_EMAIL_HOST}</li>
            <li>PUERTO: ${process.env.TEST_EMAIL_PORT}</li>
            <li>USUARIO: ${process.env.TEST_EMAIL_USER}</li>
            <li>FECHA/HORA: ${new Date().toLocaleString()}</li>
          </ul>
        </div>
        
        <div class="footer">
          <p>RETA2 - Sistema de Autenticación</p>
        </div>
      </body>
      </html>
    `;
    
    // Definir opciones del correo
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: process.env.TEST_EMAIL_USER, // Enviamos al mismo correo para prueba
      subject: 'Prueba de configuración de correo de RETA2',
      html: htmlContent
    };
    
    console.log(`🔄 Enviando correo a: ${mailOptions.to}`);
    
    // Enviar correo
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Correo enviado exitosamente!');
    console.log('Información del envío:');
    console.log(`- ID del mensaje: ${info.messageId}`);
    console.log(`- URL para previsualizar: ${nodemailer.getTestMessageUrl(info)}`);
    
    return info;
  } catch (error) {
    console.error('❌ Error al enviar el correo:', error);
    throw error;
  }
}

// Ejecutar la prueba
testEmail()
  .then(() => {
    console.log('✅ Prueba completada exitosamente.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ La prueba falló con error:', error);
    process.exit(1);
  });
