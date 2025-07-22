const { UserBadge, Badge } = require('../models');

async function awardTestBadges() {
  try {
    console.log('🏅 Otorgando insignias de prueba...');
    
    // Usuario de prueba fijo
    const testUserId = '91f709ca-3830-488c-9168-fbe5bd68ba90';
    
    // Insignias para otorgar
    const badgesToAward = [
      'Primer Desafío',
      'Desafiante', 
      'Red Social',
      'Aprendiz'
    ];
    
    for (const badgeName of badgesToAward) {
      // Buscar la insignia
      const badge = await Badge.findOne({ where: { name: badgeName } });
      
      if (badge) {
        // Verificar si ya la tiene
        const hasBadge = await UserBadge.findOne({
          where: { userId: testUserId, badgeId: badge.id }
        });
        
        if (!hasBadge) {
          await UserBadge.create({
            userId: testUserId,
            badgeId: badge.id,
            dateEarned: new Date()
          });
          
          console.log(`✅ Insignia otorgada: ${badgeName}`);
        } else {
          console.log(`⚠️  Usuario ya tiene la insignia: ${badgeName}`);
        }
      } else {
        console.log(`❌ Insignia no encontrada: ${badgeName}`);
      }
    }
    
    console.log('🎉 ¡Insignias de prueba otorgadas!');
  } catch (error) {
    console.error('❌ Error al otorgar insignias:', error);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  awardTestBadges().then(() => process.exit(0));
}

module.exports = awardTestBadges;
