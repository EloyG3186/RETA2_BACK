const { sequelize } = require('../config/database');
const Challenge = require('../models/Challenge');
const Category = require('../models/Category');

// Load environment variables
require('dotenv').config();

/**
 * Script to fix inconsistent challenge category storage
 * This script will:
 * 1. Find challenges with only category names but no categoryId
 * 2. Find challenges with only categoryId but no category name
 * 3. Fix cases where category field contains UUID instead of name
 * 4. Normalize the data to have both fields populated consistently
 */

async function fixChallengeCategories() {
  console.log('🔧 Starting challenge category normalization...');
  console.log('📋 Database config:', {
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'challenge_friends_db',
    user: process.env.DB_USER || 'postgres'
  });
  
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
        
        const categoryRecord = await Category.findOne({
          where: { name: challenge.category }
        });
        
        if (categoryRecord) {
          updateData.categoryId = categoryRecord.id;
          needsUpdate = true;
          console.log(`✅ Will set categoryId to: ${categoryRecord.id}`);
        } else {
          console.log(`❌ Category '${challenge.category}' not found in database`);
        }
      }
      
      // Case 3: Has both fields - check for inconsistencies and UUID in category field
      else if (challenge.category && challenge.categoryId) {
        // Check if category field contains a UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(challenge.category);
        
        if (isUUID) {
          console.log(`🔍 Challenge ${challenge.id} has UUID in category field: ${challenge.category}`);
          
          // The category field contains a UUID, need to fix it
          const categoryByUUID = await Category.findByPk(challenge.category);
          if (categoryByUUID) {
            updateData.category = categoryByUUID.name;
            updateData.categoryId = categoryByUUID.id;
            needsUpdate = true;
            console.log(`✅ Will fix category from UUID to name: ${categoryByUUID.name}`);
          } else {
            console.log(`❌ Category with UUID ${challenge.category} not found`);
            
            // Try to find by the existing categoryId instead
            const categoryById = await Category.findByPk(challenge.categoryId);
            if (categoryById) {
              updateData.category = categoryById.name;
              needsUpdate = true;
              console.log(`✅ Will fix category using categoryId: ${categoryById.name}`);
            }
          }
        } else {
          // Normal case - verify consistency
          const categoryRecord = await Category.findByPk(challenge.categoryId);
          if (categoryRecord && categoryRecord.name !== challenge.category) {
            console.log(`🔍 Challenge ${challenge.id} has inconsistent category data`);
            console.log(`   DB category name: ${categoryRecord.name}`);
            console.log(`   Challenge category: ${challenge.category}`);
            
            updateData.category = categoryRecord.name;
            needsUpdate = true;
            console.log(`✅ Will fix category name to match DB: ${categoryRecord.name}`);
          }
        }
      }
      
      // Case 4: Has neither field
      else {
        console.log(`⚠️ Challenge ${challenge.id} has no category information`);
      }
      
      // Update the challenge if needed
      if (needsUpdate) {
        await Challenge.update(updateData, {
          where: { id: challenge.id }
        });
        
        console.log(`🔧 Updated challenge ${challenge.id}:`, updateData);
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
