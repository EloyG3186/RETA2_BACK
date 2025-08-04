const nodemailer = require('nodemailer');
const config = require('../config/config');

/**
 * Configuración del transporte de correo según el entorno
 */
const createTransporter = async () => {
  // Para desarrollo: usar Gmail con credenciales de aplicación
  // Para producción: configurar un servicio real como Gmail, Sendgrid, etc.
  
  console.log('Creando transporter de correo para entorno:', process.env.NODE_ENV);
  
  if (process.env.NODE_ENV === 'production') {
    console.log('Usando configuración de producción para correos');
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  } else {
    // Para desarrollo, usamos Gmail con las credenciales configuradas
    console.log('Usando configuración de Gmail para correos de desarrollo');
    
    // Verificar si tenemos credenciales de Gmail configuradas
    if (!process.env.TEST_EMAIL_USER || !process.env.TEST_EMAIL_PASSWORD) {
      console.error('No se encontraron credenciales de Gmail en las variables de entorno');
      console.error('Por favor configura TEST_EMAIL_USER y TEST_EMAIL_PASSWORD en tu archivo .env');
      throw new Error('Credenciales de correo no configuradas');
    }
    
    // Usar credenciales de Gmail para desarrollo
    console.log(`Configurando servicio de correo con: ${process.env.TEST_EMAIL_USER}`);
    console.log(`- Host: ${process.env.TEST_EMAIL_HOST}`);
    console.log(`- Puerto: ${process.env.TEST_EMAIL_PORT}`);
    
    return nodemailer.createTransport({
      host: process.env.TEST_EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.TEST_EMAIL_PORT) || 587,
      secure: false, // Para el puerto 587, debe ser false
      auth: {
        user: process.env.TEST_EMAIL_USER,
        pass: process.env.TEST_EMAIL_PASSWORD
      },
      requireTLS: true, // Forzar uso de TLS
    });
  }
};

/**
 * Envía un correo electrónico
 * @param {Object} mailOptions - Opciones del correo (destinatario, asunto, html, etc)
 * @returns {Promise} - Promesa con el resultado del envío
 */
const fs = require('fs');
const path = require('path');

// Función para guardar correos en archivos de texto en entorno de desarrollo
const saveEmailToFile = (mailOptions) => {
  try {
    // Crear directorio para almacenar los correos si no existe
    const emailDir = path.join(process.cwd(), 'dev-emails');
    if (!fs.existsSync(emailDir)) {
      fs.mkdirSync(emailDir, { recursive: true });
    }
    
    // Crear un nombre de archivo basado en el destinatario y la fecha
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(emailDir, `email-${mailOptions.to.replace('@', '_at_')}-${timestamp}.html`);
    
    // Crear contenido del archivo
    const content = `
----- CORREO DE DESARROLLO -----
Fecha: ${new Date().toLocaleString()}
Para: ${mailOptions.to}
Asunto: ${mailOptions.subject}

${mailOptions.html}
`;
    
    // Guardar el archivo
    fs.writeFileSync(filename, content);
    
    console.log('===== CORREO GUARDADO PARA DESARROLLO =====');
    console.log(`Correo guardado en: ${filename}`);
    console.log(`Para: ${mailOptions.to}`);
    console.log(`Asunto: ${mailOptions.subject}`);
    
    // Extraer y mostrar enlaces de verificación del HTML
    const linkRegex = /href="(http[^"]+)"/g;
    let match;
    const links = [];
    
    while ((match = linkRegex.exec(mailOptions.html)) !== null) {
      links.push(match[1]);
    }
    
    if (links.length > 0) {
      console.log('Enlaces encontrados en el correo:');
      links.forEach((link, index) => {
        console.log(`${index + 1}. ${link}`);
      });
    }
    
    console.log('==========================================');
    
    // Devolver un objeto similar al que devuelve nodemailer
    return {
      messageId: `dev-${timestamp}@localhost`,
      envelope: {
        from: mailOptions.from,
        to: [mailOptions.to]
      },
      accepted: [mailOptions.to],
      rejected: [],
      pending: [],
      response: 'OK'
    };
  } catch (error) {
    console.error('Error al guardar correo en archivo:', error);
    throw error;
  }
};

const sendEmail = async (mailOptions) => {
  try {
    // En entorno de desarrollo, podemos guardar el correo en un archivo o enviarlo realmente
    // dependiendo de la variable SEND_REAL_EMAILS
    if (process.env.NODE_ENV !== 'production' && process.env.SEND_REAL_EMAILS !== 'true') {
      console.log('Modo desarrollo: guardando correo en archivo en lugar de enviarlo');
      return saveEmailToFile(mailOptions);
    }
    
    // En producción, enviar el correo normalmente
    console.log('Creando transporter para envío de correo...');
    const transporter = await createTransporter();
    console.log('Transporter creado correctamente');
    
    // Configurar opciones del correo
    const emailOptions = {
      from: process.env.EMAIL_FROM || '"Challenge Friends" <noreply@challengefriends.com>',
      ...mailOptions
    };
    
    console.log(`Enviando correo a: ${emailOptions.to}`);
    console.log(`Asunto: ${emailOptions.subject}`);
    
    // Enviar el correo
    const info = await transporter.sendMail(emailOptions);
    
    // Mostrar información sobre el correo enviado
    console.log('Correo enviado con éxito:');
    console.log(`- ID del mensaje: ${info.messageId}`);
    
    // Si estamos usando Ethereal, mostrar la URL para ver el correo
    if (process.env.NODE_ENV !== 'production' && info.messageId) {
      console.log('Vista previa del correo disponible en:');
      console.log(`- ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return info;
  } catch (error) {
    console.error('Error al enviar correo:', error);
    console.error('Detalles del error:', JSON.stringify(error, null, 2));
    throw error;
  }
};

/**
 * Genera y envía un correo de resumen de actividad
 * @param {Object} user - Usuario destinatario
 * @param {Object} summaryData - Datos del resumen (estadísticas, desafíos, etc)
 * @param {string} period - Período del resumen (weekly/monthly)
 * @returns {Promise} - Promesa con el resultado del envío
 */
const sendActivitySummary = async (user, summaryData, period) => {
  if (!user || !user.email) {
    throw new Error('Usuario inválido o sin dirección de correo');
  }

  const periodText = period === 'weekly' ? 'semanal' : 'mensual';
  const title = `Resumen ${periodText} de Challenge Friends`;

  // Generar el contenido HTML del resumen
  const htmlContent = generateSummaryHtml(summaryData, period, user.name || user.username);

  return sendEmail({
    to: user.email,
    subject: title,
    html: htmlContent
  });
};

/**
 * Genera el HTML para el correo de resumen
 * @param {Object} summaryData - Datos del resumen
 * @param {string} period - Período del resumen (weekly/monthly)
 * @param {string} userName - Nombre del usuario
 * @returns {string} - HTML del correo
 */
const generateSummaryHtml = (summaryData, period, userName) => {
  const { stats, completedChallenges, newChallenges, achievements, highlights } = summaryData;
  const periodText = period === 'weekly' ? 'semanal' : 'mensual';
  const dateRange = `${new Date(summaryData.startDate).toLocaleDateString()} - ${new Date(summaryData.endDate).toLocaleDateString()}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        .stat-box { background-color: #f9fafb; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
        .highlight { background-color: #eef2ff; border-left: 4px solid #4F46E5; padding: 10px 15px; margin-bottom: 15px; }
        .achievement { display: flex; align-items: center; margin-bottom: 10px; }
        .achievement-icon { width: 24px; height: 24px; margin-right: 10px; }
        h2 { color: #4F46E5; }
        a { color: #4F46E5; text-decoration: none; }
        .btn { display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Tu Resumen ${periodText}</h1>
        <p>${dateRange}</p>
      </div>
      
      <div class="content">
        <p>Hola ${userName},</p>
        
        <p>Aquí tienes un resumen de tu actividad ${periodText} en Challenge Friends:</p>
        
        <div class="stat-box">
          <h2>Tus estadísticas</h2>
          <p>✅ Desafíos completados: <strong>${stats.completedChallenges || 0}</strong></p>
          <p>🏆 Victorias: <strong>${stats.wins || 0}</strong></p>
          <p>🥈 Tasa de éxito: <strong>${stats.winRate || '0%'}</strong></p>
          <p>💰 Ganancias: <strong>$${stats.earnings || 0}</strong></p>
        </div>
        
        ${completedChallenges && completedChallenges.length > 0 ? `
        <div class="stat-box">
          <h2>Desafíos Completados</h2>
          <ul>
            ${completedChallenges.map(challenge => `
              <li>
                <strong>${challenge.title}</strong> - 
                ${challenge.result === 'win' ? '🏆 Victoria' : challenge.result === 'loss' ? '❌ Derrota' : '🤝 Empate'}
              </li>
            `).join('')}
          </ul>
        </div>
        ` : ''}
        
        ${newChallenges && newChallenges.length > 0 ? `
        <div class="stat-box">
          <h2>Nuevos Desafíos</h2>
          <ul>
            ${newChallenges.map(challenge => `
              <li>
                <strong>${challenge.title}</strong> - 
                ${challenge.status === 'pending' ? '⏳ Pendiente' : '▶️ En progreso'}
              </li>
            `).join('')}
          </ul>
        </div>
        ` : ''}
        
        ${achievements && achievements.length > 0 ? `
        <div class="stat-box">
          <h2>Logros Desbloqueados</h2>
          ${achievements.map(achievement => `
            <div class="achievement">
              <div class="achievement-icon">🏅</div>
              <div>
                <strong>${achievement.title}</strong>
                <p>${achievement.description}</p>
              </div>
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        ${highlights ? `
        <div class="highlight">
          <h2>Highlights</h2>
          ${highlights.biggestWin ? `<p>🌟 Mayor victoria: <strong>${highlights.biggestWin.title}</strong></p>` : ''}
          ${highlights.mostActiveDay ? `<p>📅 Día más activo: <strong>${new Date(highlights.mostActiveDay).toLocaleDateString()}</strong></p>` : ''}
        </div>
        ` : ''}
        
        <p>Revisa tu progreso completo y participa en nuevos desafíos:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://challengefriends.com'}" class="btn">Ver mi dashboard</a>
        </div>
      </div>
      
      <div class="footer">
        <p>Challenge Friends - La plataforma para competir con amigos</p>
        <p>
          <a href="${process.env.FRONTEND_URL}/settings/notifications">Administrar preferencias de correo</a> | 
          <a href="${process.env.FRONTEND_URL}/help">Ayuda</a>
        </p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Genera y envía un correo de verificación de cuenta
 * @param {Object} user - Usuario destinatario
 * @param {string} token - Token de verificación
 * @returns {Promise} - Promesa con el resultado del envío
 */
const sendVerificationEmail = async (user, token) => {
  if (!user || !user.email) {
    throw new Error('Usuario inválido o sin dirección de correo');
  }

  // Obtener la URL del frontend desde las variables de entorno o usar valor por defecto
  // Asegurarnos de que solo se use una URL de frontend, no múltiples
  const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split('|')[0].trim() : 'http://localhost:3000';
  console.log('URL del frontend:', frontendUrl);
  
  // Construir la URL de verificación correctamente con email como parámetro
  const verificationUrl = `${frontendUrl}/verify-email/${token}?email=${encodeURIComponent(user.email)}`;
  
  // URL alternativa para verificar directamente por email (solo para desarrollo)
  const directVerificationUrl = `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/users/verify-email-by-email/${user.email}`;
  
  console.log('URL de verificación:', verificationUrl);
  console.log('URL de verificación directa (solo desarrollo):', directVerificationUrl);
  console.log('Token de verificación:', token);
  console.log('Enviando correo a:', user.email);

  // Construir el contenido HTML del correo
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verifica tu cuenta de Challenge Friends</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        .verification-box { background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .verification-code { font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #4F46E5; }
        h2 { color: #4F46E5; }
        a { color: #4F46E5; text-decoration: none; }
        .btn { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Verifica tu cuenta</h1>
      </div>
      
      <div class="content">
        <p>Hola ${user.fullName || user.username},</p>
        
        <p>Gracias por registrarte en Challenge Friends. Para completar tu registro y comenzar a usar nuestra plataforma, necesitamos verificar tu dirección de correo electrónico.</p>
        
        <div class="verification-box">
          <p>Haz clic en el botón de abajo para verificar tu cuenta:</p>
          <a href="${verificationUrl}" class="btn">Verificar mi cuenta</a>
        </div>
        
        <p>O también puedes copiar y pegar el siguiente enlace en tu navegador:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        
        <p>Este enlace expirará en 24 horas. Si no verificas tu cuenta dentro de este período, deberás solicitar un nuevo enlace de verificación.</p>
        
        <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #4F46E5; border-radius: 4px;">
          <p style="font-weight: bold; color: #4F46E5;">Opción alternativa para desarrollo</p>
          <p>Si tienes problemas con el enlace anterior, puedes usar este enlace alternativo (solo para entorno de desarrollo):</p>
          <p><a href="${directVerificationUrl}">${directVerificationUrl}</a></p>
        </div>
        
        <p>Si no te registraste en Challenge Friends, puedes ignorar este correo electrónico.</p>
      </div>
      
      <div class="footer">
        <p>Challenge Friends - La plataforma para competir con amigos</p>
        <p>
          <a href="${frontendUrl}/help">Ayuda</a> | 
          <a href="${frontendUrl}/privacy">Política de privacidad</a>
        </p>
      </div>
    </body>
    </html>
  `;

  try {
    console.log('Intentando enviar correo...');
    const result = await sendEmail({
      to: user.email,
      subject: 'Verifica tu cuenta de Challenge Friends',
      html: htmlContent
    });
    console.log('Correo enviado exitosamente:', result);
    return result;
  } catch (error) {
    console.error('Error detallado al enviar correo de verificación:', error);
    // Si estamos en desarrollo, mostrar información adicional para depuración
    if (process.env.NODE_ENV !== 'production') {
      console.log('Configuración de correo utilizada:', {
        host: process.env.TEST_EMAIL_HOST,
        port: process.env.TEST_EMAIL_PORT,
        user: process.env.TEST_EMAIL_USER ? '***' : 'no configurado',
        pass: process.env.TEST_EMAIL_PASSWORD ? '***' : 'no configurado',
        from: process.env.EMAIL_FROM
      });
    }
    throw error;
  }
};

module.exports = {
  sendEmail,
  sendActivitySummary,
  sendVerificationEmail
};
