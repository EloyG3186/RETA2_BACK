const { sequelize } = require('../config/database');
const Challenge = require('../models/Challenge');
const Category = require('../models/Category');

// Load environment variables
require('dotenv').config();

async function revertToUUIDs() {
  try {
    console.log('🔄 Revirtiendo categorías a UUIDs para mantener consistencia...');
    
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Obtener todas las categorías para mapeo reverso
    const categories = await Category.findAll();
    const nameToUUIDMap = {};
    categories.forEach(cat => {
      nameToUUIDMap[cat.name] = cat.id;
    });
    
    console.log('📋 Available categories for mapping:');
    categories.forEach(cat => {
      console.log(`  - "${cat.name}" → ${cat.id}`);
    });
    
    // Obtener todos los desafíos
    const challenges = await Challenge.findAll();
    console.log(`\n📊 Found ${challenges.length} challenges to analyze`);
    
    let revertedCount = 0;
    
    for (const challenge of challenges) {
      console.log(`\n📌 Analyzing: "${challenge.title}"`);
      console.log(`   Current category: "${challenge.category}"`);
      console.log(`   Current categoryId: ${challenge.categoryId}`);
      
      // Verificar si category es un nombre (no UUID) y necesita ser revertido
      const isUUID = challenge.category && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(challenge.category);
      const isNumeric = challenge.category && /^\d+$/.test(challenge.category);
      
      let needsUpdate = false;
      let updateData = {};
      
      if (!isUUID && !isNumeric && challenge.category) {
        // El category contiene un nombre, necesita ser revertido a UUID
        console.log(`   🔍 Category is a name, needs to be reverted to UUID`);
        
        const categoryUUID = nameToUUIDMap[challenge.category];
        if (categoryUUID) {
          updateData.category = categoryUUID;
          updateData.categoryId = categoryUUID; // Asegurar consistencia
          needsUpdate = true;
          console.log(`   ✅ Will revert "${challenge.category}" to UUID: ${categoryUUID}`);
        } else {
          console.log(`   ❌ No UUID found for category name: "${challenge.category}"`);
        }
      }
      else if (isNumeric) {
        // Mapeo de IDs numéricos a UUIDs
        console.log(`   🔍 Category is numeric, mapping to UUID`);
        
        const numericCategoryMap = {
          '1': 'Deportes',
          '2': 'Videojuegos', 
          '3': 'Comida',
          '4': 'Aprendizaje',
          '5': 'Fitness',
          '6': 'Otro'
        };
        
        const mappedName = numericCategoryMap[challenge.category];
        if (mappedName && nameToUUIDMap[mappedName]) {
          const categoryUUID = nameToUUIDMap[mappedName];
          updateData.category = categoryUUID;
          updateData.categoryId = categoryUUID;
          needsUpdate = true;
          console.log(`   ✅ Will map numeric ${challenge.category} (${mappedName}) to UUID: ${categoryUUID}`);
        } else {
          console.log(`   ❌ No mapping found for numeric ID: ${challenge.category}`);
        }
      }
      else if (challenge.categoryId && !challenge.category) {
        // Solo tiene categoryId, copiar al category para consistencia
        updateData.category = challenge.categoryId;
        needsUpdate = true;
        console.log(`   ✅ Will copy categoryId to category: ${challenge.categoryId}`);
      }
      else if (isUUID) {
        console.log(`   ✅ Category is already UUID - no changes needed`);
        
        // Verificar consistencia entre category y categoryId
        if (challenge.category !== challenge.categoryId) {
          updateData.categoryId = challenge.category; // Sincronizar
          needsUpdate = true;
          console.log(`   🔧 Will sync categoryId to match category UUID`);
        }
      }
      
      // Aplicar actualización si es necesaria
      if (needsUpdate) {
        try {
          await challenge.update(updateData);
          revertedCount++;
          console.log(`   💾 Updated successfully!`);
        } catch (error) {
          console.log(`   ❌ Update failed:`, error.message);
        }
      } else {
        console.log(`   ✅ No changes needed`);
      }
    }
    
    console.log(`\n🎉 Reverted ${revertedCount} challenges to UUID format!`);
    console.log('📋 All challenges now have consistent UUID references in category field');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

revertToUUIDs()
  .then(() => {
    console.log('✅ Reversion to UUIDs completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Reversion failed:', error);
    process.exit(1);
  });
