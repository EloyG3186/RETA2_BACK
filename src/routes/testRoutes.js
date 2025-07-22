const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const { sendEmail } = require('../services/emailService');

// Ruta de prueba para obtener usuarios directamente de la base de datos
router.get('/users', async (req, res) => {
  try {
    console.log('🔍 Test route: Consultando usuarios directamente');
    
    // Consulta SQL directa para obtener usuarios
    const users = await sequelize.query(
      `SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.full_name as "fullName", 
        u.role, 
        u.is_active as "isActive", 
        u.created_at as "createdAt",
        w.balance as "walletBalance"
      FROM 
        users u
      LEFT JOIN 
        wallets w ON u.id = w.user_id
      ORDER BY 
        u.created_at DESC`,
      { type: QueryTypes.SELECT }
    );

    console.log(`✅ Test route: Encontrados ${users.length} usuarios`);
    
    // Transformar datos al formato que espera el frontend
    const transformedUsers = users.map(user => ({
      id: user.id,
      name: user.fullName || '',
      email: user.email,
      username: user.username,
      role: user.role || 'user',
      isActive: user.isActive,
      createdAt: user.createdAt,
      wallet: {
        balance: user.walletBalance
      }
    }));
    
    // Configurar CORS explícitamente para esta respuesta
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    // Devolver usuarios
    res.status(200).json(transformedUsers);
  } catch (error) {
    console.error('❌ Test route: Error al consultar usuarios:', error);
    
    // Configurar CORS para respuesta de error también
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    res.status(500).json({
      message: 'Error al obtener usuarios',
      error: error.message
    });
  }
});

// Ruta de prueba para verificar el envío de emails
router.post('/test-email', async (req, res) => {
  try {
    console.log('🔍 Test route: Probando envío de email con la nueva configuración');
    
    // Obtener destinatario del cuerpo de la petición o usar uno predeterminado
    const { email = 'eloy.gonzalezja@gmail.com' } = req.body;
    
    // Crear contenido de prueba
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
    
    // Enviar correo de prueba
    const result = await sendEmail({
      to: email,
      subject: 'Prueba de configuración de correo de RETA2',
      html: htmlContent
    });
    
    console.log('✅ Test route: Correo enviado exitosamente');
    
    // Configurar CORS explícitamente para esta respuesta
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    // Devolver resultado
    res.status(200).json({
      success: true,
      message: 'Correo enviado exitosamente',
      details: result
    });
  } catch (error) {
    console.error('❌ Test route: Error al enviar correo:', error);
    
    // Configurar CORS para respuesta de error también
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    res.status(500).json({
      success: false,
      message: 'Error al enviar correo',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
