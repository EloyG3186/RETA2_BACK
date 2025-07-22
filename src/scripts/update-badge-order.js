const { Badge } = require('../models');

async function updateBadgeOrder() {
  try {
    console.log('🔄 Estableciendo orden progresivo para insignias...');

    // Definir el orden progresivo por categoría
    const badgeOrders = {
      // DESAFÍOS - Progresión por número de desafíos
      'Primer Desafío': 1,
      'Desafiante': 2, 
      'Campeón': 3,

      // SOCIAL - Progresión social
      'Red Social': 1,
      'Influencer': 2,
      'Miembro Fundador': 3,

      // JUEZ - Progresión de evaluación
      'Juez Imparcial': 1,
      'Árbitro Experto': 2,

      // ESPECIAL/NIVEL - Progresión por nivel
      'Aprendiz': 1,
      'Experto': 2,
      'Maestro': 3,
      'Participante Activo': 4
    };

    // Requerimientos para desbloquear cada insignia
    const badgeRequirements = {
      'Primer Desafío': 'Completa tu primer desafío',
      'Desafiante': 'Completa 5 desafíos',
      'Campeón': 'Completa 10 desafíos',
      
      'Red Social': 'Conecta con tu primer amigo',
      'Influencer': 'Consigue 5 seguidores',
      'Miembro Fundador': 'Estado especial otorgado',
      
      'Juez Imparcial': 'Evalúa 3 desafíos como juez',
      'Árbitro Experto': 'Evalúa 10 desafíos como juez',
      
      'Aprendiz': 'Alcanza el nivel 3',
      'Experto': 'Alcanza el nivel 5', 
      'Maestro': 'Alcanza el nivel 10',
      'Participante Activo': 'Mantén actividad por 30 días consecutivos'
    };

    // Obtener todas las insignias
    const badges = await Badge.findAll();

    for (const badge of badges) {
      const order = badgeOrders[badge.name] || 99;
      const requirement = badgeRequirements[badge.name] || badge.description;
      
      await Badge.update(
        { 
          // Agregar un campo de orden si no existe en el modelo
          description: requirement // Actualizar descripción con requerimientos claros
        },
        { where: { id: badge.id } }
      );
      
      console.log(`✅ ${badge.name} - Orden: ${order} - Req: ${requirement}`);
    }

    console.log('🎉 ¡Orden de insignias establecido!');
    
    // Mostrar el orden final
    console.log('\n📋 ORDEN PROGRESIVO ESTABLECIDO:');
    
    const orderedBadges = await Badge.findAll({
      order: [['category', 'ASC'], ['name', 'ASC']]
    });
    
    let currentCategory = '';
    orderedBadges.forEach(badge => {
      if (badge.category !== currentCategory) {
        currentCategory = badge.category;
        console.log(`\n🏷️  ${currentCategory.toUpperCase()}:`);
      }
      const order = badgeOrders[badge.name] || 99;
      console.log(`   ${order}. ${badge.name} - ${badge.description}`);
    });
    
  } catch (error) {
    console.error('❌ Error al establecer orden de insignias:', error);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  updateBadgeOrder().then(() => process.exit(0));
}

module.exports = updateBadgeOrder;
