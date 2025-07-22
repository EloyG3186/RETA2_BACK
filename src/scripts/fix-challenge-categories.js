const { sequelize, Challenge, Category } = require('../models');

/**
 * Script to fix inconsistent challenge category storage
 * This script will:
 * 1. Find challenges with only category names but no categoryId
 * 2. Find challenges with only categoryId but no category name
 * 3. Normalize the data to have both fields populated consistently
 */

async function fixChallengeCategories() {
  console.log('🔧 Starting challenge category normalization...');
  
  // Test database connection
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
  
  try {
    // Get all challenges
    const challenges = await Challenge.findAll({
      include: [
        {
          model: Category,
          as: 'categoryInfo',
          required: false
        }
      ]
    });
    
    console.log(`📊 Found ${challenges.length} challenges to process`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const challenge of challenges) {
      let needsUpdate = false;
      let updateData = {};
      
      // Case 1: Has categoryId but no category name
      if (challenge.categoryId && !challenge.category) {
        console.log(`🔍 Challenge ${challenge.id} has categoryId but no category name`);
        
        const categoryRecord = await Category.findByPk(challenge.categoryId);
        if (categoryRecord) {
          updateData.category = categoryRecord.name;
          needsUpdate = true;
          console.log(`✅ Will set category to: ${categoryRecord.name}`);
        } else {
          console.log(`❌ Category with ID ${challenge.categoryId} not found`);
        }
      }
      
      // Case 2: Has category name but no categoryId
      else if (challenge.category && !challenge.categoryId) {
        console.log(`🔍 Challenge ${challenge.id} has category name but no categoryId`);
        
        // Check if category field contains a UUID instead of a name
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(challenge.category);
        
        if (isUUID) {
          console.log(`   Category field contains UUID: ${challenge.category}`);
          const categoryByUUID = await Category.findByPk(challenge.category);
          if (categoryByUUID) {
            updateData.category = categoryByUUID.name;
            updateData.categoryId = categoryByUUID.id;
            needsUpdate = true;
            console.log(`✅ Will fix category from UUID to name: ${categoryByUUID.name}`);
          } else {
            console.log(`❌ Category with UUID ${challenge.category} not found`);
          }
        } else {
          // Normal case: try to find category by name
          const categoryRecord = await Category.findOne({
            where: { name: challenge.category }
          });
          
          if (categoryRecord) {
            updateData.categoryId = categoryRecord.id;
            needsUpdate = true;
            console.log(`✅ Will set categoryId to: ${categoryRecord.id}`);
          } else {
            // Try to find by case-insensitive match
            const categoryRecordInsensitive = await Category.findOne({
              where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('name')),
                challenge.category.toLowerCase()
              )
            });
            
            if (categoryRecordInsensitive) {
              updateData.categoryId = categoryRecordInsensitive.id;
              updateData.category = categoryRecordInsensitive.name; // Also normalize the name
              needsUpdate = true;
              console.log(`✅ Found case-insensitive match: ${categoryRecordInsensitive.name}`);
            } else {
              console.log(`❌ No category found matching: ${challenge.category}`);
            }
          }
        }
      }
      
      // Case 3: Check if category field contains a UUID instead of a name
      else if (challenge.category && challenge.categoryId) {
        // Check if category field contains a UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(challenge.category);
        
        if (isUUID) {
          console.log(`🔍 Challenge ${challenge.id} has UUID in category field instead of name`);
          console.log(`   Current category (UUID): ${challenge.category}`);
          
          // Try to find the category by the UUID in the category field
          const categoryByUUID = await Category.findByPk(challenge.category);
          if (categoryByUUID) {
            updateData.category = categoryByUUID.name;
            updateData.categoryId = categoryByUUID.id;
            needsUpdate = true;
            console.log(`✅ Will fix category to: ${categoryByUUID.name}`);
          } else {
            // Use the categoryId field instead
            const categoryRecord = await Category.findByPk(challenge.categoryId);
            if (categoryRecord) {
              updateData.category = categoryRecord.name;
              needsUpdate = true;
              console.log(`✅ Will fix category to: ${categoryRecord.name} (from categoryId field)`);
            }
          }
        } else {
          // Normal case: check if they are inconsistent
          const categoryRecord = await Category.findByPk(challenge.categoryId);
          if (categoryRecord && categoryRecord.name !== challenge.category) {
            console.log(`🔍 Challenge ${challenge.id} has inconsistent category data`);
            console.log(`   Current category: ${challenge.category}`);
            console.log(`   CategoryId points to: ${categoryRecord.name}`);
          
          // Use the categoryId as the source of truth
          updateData.category = categoryRecord.name;
          needsUpdate = true;
          console.log(`✅ Will normalize category to: ${categoryRecord.name}`);
        }
      }
      
      // Update the challenge if needed
      if (needsUpdate) {
        await Challenge.update(updateData, {
          where: { id: challenge.id }
        });
        
        console.log(`🔧 Updated challenge ${challenge.id}`);
        fixedCount++;
      } else {
        skippedCount++;
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Fixed: ${fixedCount} challenges`);
    console.log(`   ⏭️  Skipped: ${skippedCount} challenges`);
    console.log(`\n🎉 Category normalization completed!`);
    
  } catch (error) {
    console.error('❌ Error during category normalization:', error);
    throw error;
  } finally {
    // Close database connection
    await sequelize.close();
  }
}

// Run the script if called directly
if (require.main === module) {
  fixChallengeCategories()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixChallengeCategories };
