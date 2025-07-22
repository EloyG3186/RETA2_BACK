const { sequelize, Challenge, Category } = require('../models');

/**
 * Script to test category filtering functionality
 */

async function testCategoryFiltering() {
  console.log('🧪 Testing category filtering functionality...');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // 1. Test getting all categories
    console.log('\n1️⃣ Testing category retrieval:');
    const categories = await Category.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']]
    });
    
    console.log(`Found ${categories.length} active categories:`);
    categories.forEach(cat => {
      console.log(`   - ${cat.name} (ID: ${cat.id})`);
    });
    
    // 2. Test getting all challenges with category info
    console.log('\n2️⃣ Testing challenge-category relationships:');
    const challenges = await Challenge.findAll({
      include: [
        {
          model: Category,
          as: 'categoryInfo',
          required: false
        }
      ],
      limit: 10
    });
    
    console.log(`Found ${challenges.length} challenges with category info:`);
    challenges.forEach(challenge => {
      console.log(`   - Challenge: ${challenge.title}`);
      console.log(`     Category field: ${challenge.category || 'NULL'}`);
      console.log(`     CategoryId field: ${challenge.categoryId || 'NULL'}`);
      console.log(`     Category info: ${challenge.categoryInfo ? challenge.categoryInfo.name : 'NULL'}`);
      console.log('');
    });
    
    // 3. Test filtering by category name
    console.log('\n3️⃣ Testing category name filtering:');
    const sportsChallenges = await Challenge.findAll({
      where: {
        category: 'Deportes'
      }
    });
    console.log(`Found ${sportsChallenges.length} challenges with category 'Deportes'`);
    
    // 4. Test filtering by category ID
    console.log('\n4️⃣ Testing category ID filtering:');
    const deportesCategory = categories.find(cat => cat.name === 'Deportes');
    if (deportesCategory) {
      const sportsChallengesByID = await Challenge.findAll({
        where: {
          categoryId: deportesCategory.id
        }
      });
      console.log(`Found ${sportsChallengesByID.length} challenges with categoryId '${deportesCategory.id}'`);
    }
    
    // 5. Test the new filtering logic (like in getChallenges)
    console.log('\n5️⃣ Testing enhanced filtering logic:');
    const { Op } = require('sequelize');
    
    // Test with category name
    const nameFilter = 'Deportes';
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nameFilter);
    
    let searchConditions = {};
    if (isUUID) {
      searchConditions.categoryId = nameFilter;
    } else {
      searchConditions[Op.or] = [
        { category: nameFilter },
        { category: { [Op.iLike]: `%${nameFilter}%` } }
      ];
    }
    
    const filteredChallenges = await Challenge.findAll({
      where: searchConditions
    });
    
    console.log(`Enhanced filtering for '${nameFilter}' found ${filteredChallenges.length} challenges`);
    
    console.log('\n🎉 Category filtering tests completed!');
    
  } catch (error) {
    console.error('❌ Error during category filtering tests:', error);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  testCategoryFiltering()
    .then(() => {
      console.log('✅ Tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Tests failed:', error);
      process.exit(1);
    });
}

module.exports = { testCategoryFiltering };
