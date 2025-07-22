const { sequelize, TimelineEvent, User, Challenge } = require('../models');

async function updateTimelineEvents() {
  try {
    console.log('🔄 Iniciando actualización de eventos de timeline...');
    
    // Patrón para detectar UUIDs en las descripciones
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    
    // Obtener todos los eventos de timeline
    const events = await TimelineEvent.findAll();

    console.log(`📊 Revisando ${events.length} eventos de timeline...`);
    
    let updatedCount = 0;

    for (const event of events) {
      const uuidMatches = event.description.match(uuidPattern);
      
      if (uuidMatches && uuidMatches.length > 0) {
        console.log(`🔧 Actualizando evento: ${event.id}`);
        console.log(`   Tipo: ${event.type}`);
        console.log(`   Descripción actual: ${event.description}`);
        
        let newDescription = event.description;
        
        // Reemplazar cada UUID encontrado con el nombre del usuario
        for (const userId of uuidMatches) {
          try {
            const user = await User.findByPk(userId, {
              attributes: ['fullName', 'username']
            });
            
            if (user) {
              const userName = `${user.fullName || user.username || 'Usuario'} (${user.username || 'N/A'})`;
              newDescription = newDescription.replace(userId, userName);
              console.log(`   🔄 Reemplazando ${userId} con ${userName}`);
            }
          } catch (userError) {
            console.log(`   ⚠️ No se pudo obtener usuario ${userId}:`, userError.message);
          }
        }
        
        if (newDescription !== event.description) {
          await event.update({
            description: newDescription
          });
          
          console.log(`   ✅ Nueva descripción: ${newDescription}`);
          updatedCount++;
        }
      }
    }
    
    console.log(`✅ Actualización completada. ${updatedCount} eventos actualizados.`);
    
  } catch (error) {
    console.error('❌ Error actualizando eventos:', error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  updateTimelineEvents();
}

module.exports = updateTimelineEvents;
