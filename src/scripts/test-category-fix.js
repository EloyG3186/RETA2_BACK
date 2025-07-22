const { sequelize, Challenge, Category } = require('../models');

async function testCategoryFix() {
  try {
    console.log('🔍 Testing category JOIN and processing...');
    
    // Simular lo que hace getChallenges
    const challenges = await Challenge.findAll({
      include: [{
        model: Category,
        as: 'categoryInfo',
        attributes: ['id', 'name', 'description'],
        required: false
      }],
      limit: 3
    });
    
    console.log(`\n📊 Found ${challenges.length} challenges to test:`);
    
    for (const challenge of challenges) {
      const challengeData = challenge.toJSON();
      
      console.log(`\n🎯 Challenge: ${challengeData.title}`);
      console.log(`   Original category field: ${challengeData.category}`);
      console.log(`   CategoryInfo from JOIN:`, challengeData.categoryInfo ? challengeData.categoryInfo.name : 'null');
      
      // Apply the same logic as in the controller
      if (challengeData.categoryInfo) {
        challengeData.categoryId = challengeData.category; // Guardar UUID original
        challengeData.category = challengeData.categoryInfo.name; // Reemplazar UUID con nombre
        challengeData.categoryName = challengeData.categoryInfo.name;
        challengeData.categoryDescription = challengeData.categoryInfo.description;
        console.log(`   ✅ After processing - category: ${challengeData.category}`);
        console.log(`   ✅ After processing - categoryName: ${challengeData.categoryName}`);
      } else {
        console.log(`   ❌ No categoryInfo from JOIN`);
        
        // Fallback - buscar manualmente
        if (challengeData.category) {
          const categoryRecord = await Category.findByPk(challengeData.category);
          if (categoryRecord) {
            challengeData.categoryId = challengeData.category;
            challengeData.category = categoryRecord.name;
            challengeData.categoryName = categoryRecord.name;
            console.log(`   🔄 Fallback success - category: ${challengeData.category}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

testCategoryFix();
