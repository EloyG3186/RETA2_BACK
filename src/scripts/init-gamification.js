const { sequelize, User, UserPoints, Badge, UserBadge } = require('../models');

async function initGamification() {
  try {
    console.log('🎮 Inicializando sistema de gamificación...');
    
    // Sincronizar tablas
    await UserPoints.sync({ force: false });
    await Badge.sync({ force: false });
    await UserBadge.sync({ force: false });
    console.log('✅ Tablas sincronizadas');
    
    // Crear insignias por defecto si no existen
    const defaultBadges = [
      {
        name: 'Primer Desafío',
        description: 'Creaste tu primer desafío',
        category: 'challenges'
      },
      {
        name: 'Desafiante',
        description: 'Has creado 5 desafíos',
        category: 'challenges'
      },
      {
        name: 'Campeón',
        description: 'Has ganado 3 desafíos consecutivos',
        category: 'challenges'
      },
      {
        name: 'Participante Activo',
        description: 'Has participado en 5 desafíos',
        category: 'social'
      },
      {
        name: 'Juez Imparcial',
        description: 'Has sido juez en un desafío',
        category: 'judge'
      },
      {
        name: 'Árbitro Experto',
        description: 'Has sido juez en 10 desafíos',
        category: 'judge'
      },
      {
        name: 'Aprendiz',
        description: 'Alcanzaste el nivel 3',
        category: 'special'
      },
      {
        name: 'Experto',
        description: 'Alcanzaste el nivel 5',
        category: 'special'
      },
      {
        name: 'Maestro',
        description: 'Alcanzaste el nivel 10',
        category: 'special'
      }
    ];
    
    for (const badgeData of defaultBadges) {
      const [badge, created] = await Badge.findOrCreate({
        where: { name: badgeData.name, category: badgeData.category },
        defaults: badgeData
      });
      
      if (created) {
        console.log(`✅ Insignia creada: ${badge.name}`);
      }
    }
    
    // Obtener todos los usuarios y crear UserPoints si no existen
    const users = await User.findAll();
    console.log(`👥 Inicializando puntos para ${users.length} usuarios...`);
    
    for (const user of users) {
      const [userPoints, created] = await UserPoints.findOrCreate({
        where: { userId: user.id },
        defaults: { 
          userId: user.id,
          total: 0, 
          level: 1 
        }
      });
      
      if (created) {
        console.log(`✅ Puntos inicializados para usuario: ${user.email}`);
      }
    }
    
    console.log('🎯 Sistema de gamificación inicializado correctamente');
    
  } catch (error) {
    console.error('❌ Error al inicializar gamificación:', error);
    throw error;
  }
}

module.exports = initGamification;

if (require.main === module) {
  initGamification()
    .then(() => {
      console.log('✅ Inicialización completada');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}
