const { sequelize, Badge, UserPoints } = require('../models');

/**
 * Script para inicializar datos de gamificación en la base de datos
 */
async function initGamificationData() {
  try {
    console.log('Iniciando la inicialización de datos de gamificación...');

    // Verificar si ya existen insignias
    const badgeCount = await Badge.count();
    
    if (badgeCount === 0) {
      console.log('Creando insignias predeterminadas...');
      
      // Definir insignias predeterminadas
      const defaultBadges = [
        // Insignias de desafíos
        {
          name: 'Primer Desafío',
          description: 'Completaste tu primer desafío',
          category: 'challenges',
          imageUrl: '/badges/first-challenge.png'
        },
        {
          name: 'Campeón',
          description: 'Ganaste 10 desafíos',
          category: 'challenges',
          imageUrl: '/badges/champion.png'
        },
        {
          name: 'Desafiante',
          description: 'Creaste 5 desafíos',
          category: 'challenges',
          imageUrl: '/badges/challenger.png'
        },
        
        // Insignias sociales
        {
          name: 'Red Social',
          description: 'Conectaste con 5 amigos',
          category: 'social',
          imageUrl: '/badges/social-network.png'
        },
        {
          name: 'Influencer',
          description: 'Tus desafíos fueron compartidos 10 veces',
          category: 'social',
          imageUrl: '/badges/influencer.png'
        },
        
        // Insignias de juez
        {
          name: 'Juez Imparcial',
          description: 'Fuiste juez en 3 desafíos',
          category: 'judge',
          imageUrl: '/badges/fair-judge.png'
        },
        {
          name: 'Árbitro Experto',
          description: 'Fuiste juez en 10 desafíos',
          category: 'judge',
          imageUrl: '/badges/expert-judge.png'
        },
        
        // Insignias especiales
        {
          name: 'Miembro Fundador',
          description: 'Fuiste uno de los primeros usuarios de RETA2',
          category: 'special',
          imageUrl: '/badges/founder.png'
        },
        {
          name: 'Aprendiz',
          description: 'Alcanzaste el nivel 3',
          category: 'special',
          imageUrl: '/badges/apprentice.png'
        },
        {
          name: 'Experto',
          description: 'Alcanzaste el nivel 5',
          category: 'special',
          imageUrl: '/badges/expert.png'
        },
        {
          name: 'Maestro',
          description: 'Alcanzaste el nivel 10',
          category: 'special',
          imageUrl: '/badges/master.png'
        }
      ];
      
      // Crear insignias en la base de datos
      await Badge.bulkCreate(defaultBadges);
      console.log(`Se crearon ${defaultBadges.length} insignias predeterminadas.`);
    } else {
      console.log(`Ya existen ${badgeCount} insignias en la base de datos. Omitiendo creación.`);
    }
    
    console.log('Inicialización de datos de gamificación completada con éxito.');
  } catch (error) {
    console.error('Error al inicializar datos de gamificación:', error);
  } finally {
    // Cerrar conexión
    await sequelize.close();
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  initGamificationData()
    .then(() => {
      console.log('Script finalizado.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error en el script:', error);
      process.exit(1);
    });
}

module.exports = initGamificationData;
