const { sequelize } = require('../config/database');
const Challenge = require('../models/Challenge');
const Category = require('../models/Category');

// Load environment variables
require('dotenv').config();

async function fixAllCategories() {
  try {
    console.log('🔧 Starting comprehensive category fix...');
    
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Obtener todas las categorías para mapeo
    const categories = await Category.findAll();
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.id] = cat.name;
    });
    
    console.log('📋 Available categories:');
    categories.forEach(cat => {
      console.log(`  - ${cat.id}: ${cat.name}`);
    });
    
    // Obtener todos los desafíos
    const challenges = await Challenge.findAll();
    console.log(`\n📊 Found ${challenges.length} challenges to analyze`);
    
    let fixedCount = 0;
    
    for (const challenge of challenges) {
      let needsUpdate = false;
      let updateData = {};
      
      console.log(`\n📌 Analyzing: ${challenge.title}`);
      console.log(`   Current category: "${challenge.category}"`);
      console.log(`   Current categoryId: ${challenge.categoryId}`);
      
      // Caso 1: Category es un UUID
      const isUUID = challenge.category && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(challenge.category);
      
      if (isUUID) {
        console.log('   🔍 Category is UUID, fixing...');
        const categoryName = categoryMap[challenge.category];
        if (categoryName) {
          updateData.category = categoryName;
          updateData.categoryId = challenge.category;
          needsUpdate = true;
          console.log(`   ✅ Will fix to: ${categoryName}`);
        }
      }
      
      // Caso 2: Category es un número (probablemente un ID legacy)
      else if (challenge.category && /^\d+$/.test(challenge.category)) {
        console.log('   🔍 Category is numeric ID, needs mapping...');
        
        // Mapeo básico de IDs numéricos a categorías (basado en lo que vemos)
        const numericCategoryMap = {
          '1': 'Deportes',
          '2': 'Videojuegos', 
          '3': 'Comida',
          '4': 'Aprendizaje',
          '5': 'Fitness',
          '6': 'Otro'
        };
        
        const mappedName = numericCategoryMap[challenge.category];
        if (mappedName) {
          // Buscar la categoría por nombre para obtener el UUID correcto
          const categoryRecord = categories.find(cat => cat.name === mappedName);
          if (categoryRecord) {
            updateData.category = categoryRecord.name;
            updateData.categoryId = categoryRecord.id;
            needsUpdate = true;
            console.log(`   ✅ Will fix numeric ${challenge.category} to: ${categoryRecord.name}`);
          }
        } else {
          console.log(`   ❌ No mapping found for numeric ID: ${challenge.category}`);
        }
      }
      
      // Caso 3: Solo tiene categoryId pero no category
      else if (challenge.categoryId && !challenge.category) {
        console.log('   🔍 Has categoryId but no category name...');
        const categoryName = categoryMap[challenge.categoryId];
        if (categoryName) {
          updateData.category = categoryName;
          needsUpdate = true;
          console.log(`   ✅ Will set category to: ${categoryName}`);
        }
      }
      
      // Caso 4: Solo tiene category pero no categoryId
      else if (challenge.category && !challenge.categoryId) {
        console.log('   🔍 Has category name but no categoryId...');
        const categoryRecord = categories.find(cat => cat.name === challenge.category);
        if (categoryRecord) {
          updateData.categoryId = categoryRecord.id;
          needsUpdate = true;
          console.log(`   ✅ Will set categoryId to: ${categoryRecord.id}`);
        }
      }
      
      // Aplicar actualización si es necesaria
      if (needsUpdate) {
        try {
          await challenge.update(updateData);
          fixedCount++;
          console.log(`   💾 Updated successfully!`);
        } catch (error) {
          console.log(`   ❌ Update failed:`, error.message);
        }
      } else {
        console.log(`   ✅ No changes needed`);
      }
    }
    
    console.log(`\n🎉 Fixed ${fixedCount} challenges!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

fixAllCategories()
  .then(() => {
    console.log('✅ Comprehensive fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });
