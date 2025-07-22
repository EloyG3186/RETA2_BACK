const { Badge } = require('../models');

async function testBadgeOrder() {
  try {
    console.log('🧪 Probando el orden de las insignias...');
    
    const badges = await Badge.findAll();
    
    // Simular el ordenamiento del controlador
    const badgeDifficultyOrder = {
      'Primer Desafío': 1,
      'Desafiante': 2,
      'Campeón': 3,
      'Red Social': 1,
      'Influencer': 2,
      'Miembro Fundador': 3,
      'Juez Imparcial': 1,
      'Árbitro Experto': 2,
      'Aprendiz': 1,
      'Experto': 2,
      'Maestro': 3,
      'Participante Activo': 2
    };
    
    const formattedBadges = badges.map(badge => ({
      name: badge.name,
      category: badge.category,
      description: badge.description,
      difficulty: badgeDifficultyOrder[badge.name] || 99
    }));
    
    // Ordenar como en el controlador
    const orderedBadges = formattedBadges.sort((a, b) => {
      const categoryOrder = { 'challenges': 1, 'social': 2, 'judge': 3, 'special': 4 };
      
      if (a.category !== b.category) {
        return (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99);
      }
      
      return a.difficulty - b.difficulty;
    });
    
    console.log('\n📋 ORDEN FINAL DE INSIGNIAS:');
    
    let currentCategory = '';
    orderedBadges.forEach((badge, index) => {
      if (badge.category !== currentCategory) {
        currentCategory = badge.category;
        console.log(`\n🏷️  ${currentCategory.toUpperCase()}:`);
      }
      console.log(`   ${badge.difficulty}. ${badge.name}`);
      console.log(`      "${badge.description}"`);
    });
    
    console.log('\n✅ ¡Orden de insignias verificado!');
    
  } catch (error) {
    console.error('❌ Error al probar orden:', error);
  }
}

if (require.main === module) {
  testBadgeOrder().then(() => process.exit(0));
}

module.exports = testBadgeOrder;
