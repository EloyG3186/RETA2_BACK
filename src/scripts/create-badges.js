const { Badge } = require('../models');

async function createBadges() {
  try {
    console.log('🏅 Creando insignias por defecto...');

    const badges = [
      // Insignias de desafíos
      {
        name: 'Primer Desafío',
        description: 'Completaste tu primer desafío',
        category: 'challenges',
        imageUrl: '/badges/challenges-default.svg'
      },
      {
        name: 'Desafiante',
        description: 'Completaste 5 desafíos',
        category: 'challenges',
        imageUrl: '/badges/challenges-default.svg'
      },
      {
        name: 'Campeón',
        description: 'Completaste 10 desafíos',
        category: 'challenges',
        imageUrl: '/badges/challenges-default.svg'
      },

      // Insignias sociales
      {
        name: 'Red Social',
        description: 'Conectaste con tu primera comunidad',
        category: 'social',
        imageUrl: '/badges/social-default.svg'
      },
      {
        name: 'Influencer',
        description: 'Tienes 10 seguidores en la plataforma',
        category: 'social',
        imageUrl: '/badges/social-default.svg'
      },
      {
        name: 'Miembro Fundador',
        description: 'Fuiste uno de los primeros 100 usuarios',
        category: 'social',
        imageUrl: '/badges/social-default.svg'
      },

      // Insignias de juez
      {
        name: 'Juez Imparcial',
        description: 'Evaluaste 5 desafíos como juez',
        category: 'judge',
        imageUrl: '/badges/judge-default.svg'
      },
      {
        name: 'Árbitro Experto',
        description: 'Evaluaste 20 desafíos como juez',
        category: 'judge',
        imageUrl: '/badges/judge-default.svg'
      },

      // Insignias especiales
      {
        name: 'Aprendiz',
        description: 'Alcanzaste el nivel 3',
        category: 'special',
        imageUrl: '/badges/special-default.svg'
      },
      {
        name: 'Experto',
        description: 'Alcanzaste el nivel 5',
        category: 'special',
        imageUrl: '/badges/special-default.svg'
      },
      {
        name: 'Maestro',
        description: 'Alcanzaste el nivel 10',
        category: 'special',
        imageUrl: '/badges/special-default.svg'
      },
      {
        name: 'Participante Activo',
        description: 'Has estado activo durante 30 días consecutivos',
        category: 'special',
        imageUrl: '/badges/special-default.svg'
      }
    ];

    for (const badgeData of badges) {
      const [badge, created] = await Badge.findOrCreate({
        where: { name: badgeData.name, category: badgeData.category },
        defaults: badgeData
      });

      if (created) {
        console.log(`✅ Insignia creada: ${badge.name}`);
      } else {
        console.log(`⚠️  Insignia ya existe: ${badge.name}`);
      }
    }

    console.log('🎉 ¡Insignias creadas exitosamente!');
  } catch (error) {
    console.error('❌ Error al crear insignias:', error);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  createBadges().then(() => process.exit(0));
}

module.exports = createBadges;
