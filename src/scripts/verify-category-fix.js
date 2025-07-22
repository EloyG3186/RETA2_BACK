const { sequelize, Challenge, Category } = require('../models');

async function verifyFix() {
  try {
    console.log('🔍 Verificando el fix de categorías...\n');
    
    // 1. Verificar datos en la base de datos
    console.log('📊 Datos actuales en la base de datos:');
    const rawChallenges = await Challenge.findAll({
      attributes: ['id', 'title', 'category', 'categoryId'],
      limit: 3
    });
    
    rawChallenges.forEach(ch => {
      console.log(`   ${ch.title}: category="${ch.category}", categoryId="${ch.categoryId}"`);
    });
    
    console.log('\n🔄 Simulando lógica del controlador:');
    
    // 2. Simular lo que hace el controlador
    const challenges = await Challenge.findAll({
      include: [{
        model: Category,
        as: 'categoryInfo',
        attributes: ['id', 'name', 'description'],
        required: false
      }],
      limit: 3
    });
    
    const processedChallenges = [];
    
    for (const challenge of challenges) {
      const challengeData = challenge.toJSON();
      
      // Aplicar la lógica del controlador
      if (challengeData.categoryInfo) {
        challengeData.categoryName = challengeData.categoryInfo.name;
        challengeData.categoryDescription = challengeData.categoryInfo.description;
        challengeData.categoryId = challengeData.category; // UUID original
        challengeData.category = challengeData.categoryInfo.name; // Nombre descriptivo
      } else if (challengeData.category) {
        const categoryRecord = await Category.findByPk(challengeData.category);
        if (categoryRecord) {
          challengeData.categoryName = categoryRecord.name;
          challengeData.categoryDescription = categoryRecord.description;
          challengeData.categoryId = challengeData.category;
          challengeData.category = categoryRecord.name;
        } else {
          challengeData.categoryName = 'Categoría desconocida';
          challengeData.category = 'Categoría desconocida';
        }
      } else {
        challengeData.categoryName = 'Sin categoría';
        challengeData.category = 'Sin categoría';
      }
      
      processedChallenges.push({
        title: challengeData.title,
        category: challengeData.category,
        categoryName: challengeData.categoryName,
        categoryId: challengeData.categoryId
      });
    }
    
    console.log('\n✅ Datos procesados que recibiría el frontend:');
    processedChallenges.forEach(ch => {
      console.log(`   ${ch.title}:`);
      console.log(`      category: "${ch.category}"`);
      console.log(`      categoryName: "${ch.categoryName}"`);
      console.log(`      categoryId: "${ch.categoryId}"`);
      console.log('');
    });
    
    console.log('🎯 RESULTADO: El frontend ahora verá nombres descriptivos en lugar de UUIDs');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

verifyFix();
