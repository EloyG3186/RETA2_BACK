/**
 * Script para generar notificaciones de prueba para todos los usuarios
 */
const { sequelize } = require('../config/database');
const models = require('../models');
const { setupAssociations } = require('../models/associations');

// Asegurar que las asociaciones estén configuradas
setupAssociations();

// Función para generar notificaciones de prueba
async function generateTestNotifications() {
  try {
    // Obtener todos los usuarios
    const users = await models.User.findAll();
    
    if (users.length === 0) {
      console.log('No se encontraron usuarios para generar notificaciones.');
      return;
    }
    
    console.log(`Generando notificaciones para ${users.length} usuarios...`);
    
    // Tipos de notificaciones disponibles
    const notificationTypes = [
      'challenge_judge_needed',
      'challenge_invitation',
      'judge_invitation',
      'evidence_submitted',
      'challenge_completed'
    ];
    
    // Contenido de ejemplo para cada tipo
    const contentTemplates = {
      'challenge_judge_needed': 'Se necesita un juez para el desafío "Desafío de Programación"',
      'challenge_invitation': 'Has sido invitado al desafío "Maratón de Código"',
      'judge_invitation': 'Te han invitado a ser juez en el desafío "Hackathon 2025"',
      'evidence_submitted': 'Se ha enviado una nueva evidencia para el desafío "Proyecto Final"',
      'challenge_completed': 'El desafío "Reto Semanal" ha sido completado'
    };
    
    // Crear varias notificaciones para cada usuario
    const notifications = [];
    
    for (const user of users) {
      // Crear entre 3 y 5 notificaciones por usuario
      const numNotifications = Math.floor(Math.random() * 3) + 3;
      
      for (let i = 0; i < numNotifications; i++) {
        // Seleccionar un tipo aleatorio
        const randomType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
        
        // Crear notificación con contenido aleatorio
        const notification = await models.Notification.create({
          userId: user.id,
          type: randomType,
          content: contentTemplates[randomType],
          relatedId: null, // No hay ID relacionado en estas pruebas
          isRead: Math.random() > 0.7 // 30% de probabilidad de estar leída
        });
        
        notifications.push(notification);
      }
    }
    
    console.log(`Se han generado ${notifications.length} notificaciones de prueba.`);
  } catch (error) {
    console.error('Error al generar notificaciones de prueba:', error);
  } finally {
    // Cerrar la conexión
    await sequelize.close();
  }
}

// Ejecutar la función
generateTestNotifications()
  .then(() => console.log('Script completado.'))
  .catch(err => console.error('Error en el script:', err));
