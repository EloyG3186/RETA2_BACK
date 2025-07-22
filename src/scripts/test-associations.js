const { sequelize, Challenge, Category } = require('../models');

async function testAssociations() {
  try {
    console.log('🔍 Testing Challenge-Category associations...');
    
    // Test finding a challenge with category info
    const challenge = await Challenge.findOne({
      include: [{
        model: Category,
        as: 'categoryInfo',
        attributes: ['id', 'name', 'description'],
        required: false
      }]
    });
    
    if (challenge) {
      console.log('✅ Challenge found:', challenge.title);
      console.log('   Category UUID:', challenge.category);
      console.log('   CategoryId:', challenge.categoryId);
      if (challenge.categoryInfo) {
        console.log('   Category Name:', challenge.categoryInfo.name);
        console.log('   Category Description:', challenge.categoryInfo.description);
      } else {
        console.log('   No category info loaded from JOIN');
      }
    } else {
      console.log('❌ No challenges found');
    }
    
    console.log('\n📊 Testing categories list:');
    const categories = await Category.findAll({
      attributes: ['id', 'name', 'description']
    });
    
    categories.forEach(cat => {
      console.log(`   - ${cat.name} (${cat.id})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

testAssociations();
