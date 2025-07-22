const { Challenge, Category } = require('../models');

async function debugCategories() {
  try {
    console.log('🔍 Verificando categorías en la base de datos...\n');
    
    // 1. Obtener todas las categorías
    const categories = await Category.findAll();
    console.log('📋 Categorías existentes:');
    categories.forEach(cat => {
      console.log(`  - ID: ${cat.id} | Nombre: ${cat.name}`);
    });
    
    // 2. Obtener algunos challenges
    const challenges = await Challenge.findAll({ limit: 3 });
    console.log('\n📋 Algunos challenges:');
    challenges.forEach(challenge => {
      console.log(`  - Challenge: ${challenge.title}`);
      console.log(`    category: ${challenge.category}`);
      console.log(`    categoryId: ${challenge.categoryId}`);
      
      // Verificar si el categoryId coincide con alguna categoría
      const matchingCategory = categories.find(cat => cat.id === challenge.categoryId || cat.id === challenge.category);
      if (matchingCategory) {
        console.log(`    ✅ MATCH: ${matchingCategory.name}`);
      } else {
        console.log(`    ❌ NO MATCH: No se encuentra categoría con este ID`);
      }
      console.log('');
    });
    
    // 3. Probar el JOIN directamente
    console.log('🔍 Probando JOIN directo...');
    const challengeWithCategory = await Challenge.findAll({
      limit: 2,
      include: [{
        model: Category,
        as: 'categoryInfo',
        attributes: ['id', 'name', 'description'],
        required: false
      }]
    });
    
    challengeWithCategory.forEach((challenge, index) => {
      console.log(`\n--- JOIN Test ${index + 1} ---`);
      console.log(`Challenge: ${challenge.title}`);
      console.log(`Campo category: ${challenge.category}`);
      console.log(`Campo categoryId: ${challenge.categoryId}`);
      console.log(`JOIN result: ${challenge.categoryInfo ? challenge.categoryInfo.name : 'NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugCategories();
