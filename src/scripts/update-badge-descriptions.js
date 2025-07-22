const { Badge } = require('../models');

async function updateBadgeDescriptions() {
  try {
    console.log('📝 Actualizando descripciones de insignias con requisitos claros...');

    // Nuevas descripciones con requisitos específicos
    const badgeDescriptions = {
      'Primer Desafío': 'Completa tu primer desafío',
      'Desafiante': 'Completa 5 desafíos exitosamente', 
      'Campeón': 'Completa 10 desafíos y demuestra tu experiencia',
      
      'Red Social': 'Conecta con tu primer amigo en la plataforma',
      'Influencer': 'Consigue 5 seguidores y expande tu red',
      'Miembro Fundador': 'Insignia especial para usuarios pioneros',
      
      'Juez Imparcial': 'Evalúa 3 desafíos como juez con imparcialidad',
      'Árbitro Experto': 'Evalúa 10 desafíos y conviértete en experto',
      
      'Aprendiz': 'Alcanza el nivel 3 en tu progreso',
      'Experto': 'Alcanza el nivel 5 y demuestra tu experiencia',
      'Maestro': 'Alcanza el nivel 10 - El máximo reconocimiento',
      'Participante Activo': 'Mantén actividad constante por 30 días'
    };

    // Actualizar cada insignia
    for (const [badgeName, description] of Object.entries(badgeDescriptions)) {
      const updated = await Badge.update(
        { description: description },
        { where: { name: badgeName } }
      );
      
      if (updated[0] > 0) {
        console.log(`✅ ${badgeName} - "${description}"`);
      } else {
        console.log(`⚠️  No se encontró: ${badgeName}`);
      }
    }

    console.log('\n🎉 ¡Descripciones actualizadas!');
    
    // Mostrar el resultado final ordenado
    console.log('\n📋 INSIGNIAS CON NUEVO ORDEN Y DESCRIPCIONES:');
    
    const categories = [
      { key: 'challenges', name: 'DESAFÍOS' },
      { key: 'social', name: 'SOCIAL' },
      { key: 'judge', name: 'JUEZ' },
      { key: 'special', name: 'ESPECIAL' }
    ];
    
    for (const category of categories) {
      console.log(`\n🏷️  ${category.name}:`);
      
      const badges = await Badge.findAll({
        where: { category: category.key },
        order: [['name', 'ASC']]
      });
      
      // Ordenar manualmente por dificultad
      const difficultyOrder = {
        'Primer Desafío': 1, 'Desafiante': 2, 'Campeón': 3,
        'Red Social': 1, 'Influencer': 2, 'Miembro Fundador': 3,
        'Juez Imparcial': 1, 'Árbitro Experto': 2,
        'Aprendiz': 1, 'Experto': 2, 'Maestro': 3, 'Participante Activo': 2
      };
      
      const sortedBadges = badges.sort((a, b) => {
        return (difficultyOrder[a.name] || 99) - (difficultyOrder[b.name] || 99);
      });
      
      sortedBadges.forEach((badge, index) => {
        const diff = difficultyOrder[badge.name] || '?';
        console.log(`   ${index + 1}. ${badge.name} (Dif: ${diff})`);
        console.log(`      "${badge.description}"`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error al actualizar descripciones:', error);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  updateBadgeDescriptions().then(() => process.exit(0));
}

module.exports = updateBadgeDescriptions;
