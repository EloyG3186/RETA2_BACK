require('dotenv').config();
const nodemailer = require('nodemailer');

// Configuración clara y explícita
const USER = 'eloy.gonzalezja2@gmail.com';
const PASS = 'snoj pblx mjog dkun';
const HOST = 'smtp.gmail.com';
const PORT = 587;

async function probarEmail() {
  console.log('=== CONFIGURACIÓN DE CORREO ===');
  console.log(`HOST: ${HOST}`);
  console.log(`PUERTO: ${PORT}`);
  console.log(`USUARIO: ${USER}`);
  console.log('==============================');

  try {
    // Crear transporter con valores explícitos
    const transporter = nodemailer.createTransport({
      host: HOST,
      port: PORT,
      secure: false,
      auth: {
        user: USER,
        pass: PASS
      },
      requireTLS: true
    });
    
    console.log('Verificando conexión...');
    await transporter.verify();
    console.log('✅ Conexión SMTP verificada correctamente');
    
    // Enviar un email simple
    const info = await transporter.sendMail({
      from: `"RETA2" <${USER}>`,
      to: "eloy.gonzalezja@gmail.com",
      subject: "Prueba de Gmail ✅",
      text: "Este es un correo de prueba enviado desde Node.js",
      html: "<b>Este es un correo de prueba enviado desde Node.js</b>"
    });
    
    console.log('✅ Correo enviado con éxito');
    console.log(`ID del mensaje: ${info.messageId}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

probarEmail();
