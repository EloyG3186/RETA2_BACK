const { Badge } = require('../models');

async function addBadgeDifficulty() {
  try {
    console.log('🔄 Agregando campo de dificultad a insignias...');

    // Primero, intentar agregar la columna a la tabla (si no existe)
    const sequelize = Badge.sequelize;
    
    try {
      await sequelize.query(`
        ALTER TABLE "Badges" ADD COLUMN "difficulty" INTEGER DEFAULT 1;
      `);
      console.log('✅ Columna difficulty agregada');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Columna difficulty ya existe');
      } else {
        console.log('⚠️  No se pudo agregar columna, continuando...');
      }
    }

    // Definir la dificultad/orden para cada insignia
    const badgeDifficulties = {
      // DESAFÍOS - Progresión por número de desafíos
      'Primer Desafío': 1,      // Más fácil
      'Desafiante': 2,          // Medio
      'Campeón': 3,             // Más difícil

      // SOCIAL - Progresión social
      'Red Social': 1,          // Más fácil
      'Influencer': 2,          // Medio
      'Miembro Fundador': 3,    // Especial

      // JUEZ - Progresión de evaluación
      'Juez Imparcial': 1,      // Más fácil
      'Árbitro Experto': 2,     // Más difícil

      // ESPECIAL/NIVEL - Progresión por nivel
      'Aprendiz': 1,            // Nivel 3
      'Experto': 2,             // Nivel 5
      'Maestro': 3,             // Nivel 10
      'Participante Activo': 2   // Medio (30 días)
    };

    // Actualizar cada insignia con su dificultad
    for (const [badgeName, difficulty] of Object.entries(badgeDifficulties)) {
      const updated = await Badge.update(
        { difficulty: difficulty },
        { where: { name: badgeName } }
      );
      
      if (updated[0] > 0) {
        console.log(`✅ ${badgeName} - Dificultad: ${difficulty}`);
      } else {
        console.log(`⚠️  No se encontró: ${badgeName}`);
      }
    }

    console.log('\n🎉 ¡Dificultades asignadas!');
    
    // Mostrar el orden final por categoría
    console.log('\n📋 ORDEN FINAL POR CATEGORÍA:');
    
    const categories = ['challenges', 'social', 'judge', 'special'];
    
    for (const category of categories) {
      console.log(`\n🏷️  ${category.toUpperCase()}:`);
      
      const badges = await Badge.findAll({
        where: { category },
        order: [['difficulty', 'ASC'], ['name', 'ASC']]
      });
      
      badges.forEach((badge, index) => {
        console.log(`   ${index + 1}. ${badge.name} (Dif: ${badge.difficulty || 1})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error al agregar dificultad:', error);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  addBadgeDifficulty().then(() => process.exit(0));
}

module.exports = addBadgeDifficulty;
