const { sequelize } = require('../config/database');
const Challenge = require('../models/Challenge');
const Category = require('../models/Category');

// Load environment variables
require('dotenv').config();

async function simpleFix() {
  try {
    console.log('🔧 Starting simple fix...');
    
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Obtener el desafío específico que tiene problema
    const problemChallenge = await Challenge.findByPk('ca5ba049-938c-49e0-96bb-d430d608e7ee');
    
    if (!problemChallenge) {
      console.log('❌ Challenge not found');
      return;
    }
    
    console.log('📌 Current challenge data:');
    console.log(`   Title: ${problemChallenge.title}`);
    console.log(`   Category: ${problemChallenge.category}`);
    console.log(`   CategoryId: ${problemChallenge.categoryId}`);
    
    // Verificar si category es un UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(problemChallenge.category);
    
    if (isUUID) {
      console.log('🔍 Category field contains UUID, fixing...');
      
      // Buscar la categoría por UUID
      const categoryRecord = await Category.findByPk(problemChallenge.category);
      
      if (categoryRecord) {
        console.log(`✅ Found category: ${categoryRecord.name}`);
        
        // Actualizar el desafío
        await problemChallenge.update({
          category: categoryRecord.name,
          categoryId: categoryRecord.id
        });
        
        console.log('✅ Challenge updated successfully!');
        
        // Verificar la actualización
        const updatedChallenge = await Challenge.findByPk('ca5ba049-938c-49e0-96bb-d430d608e7ee');
        console.log('📝 Updated challenge data:');
        console.log(`   Category: ${updatedChallenge.category}`);
        console.log(`   CategoryId: ${updatedChallenge.categoryId}`);
        
      } else {
        console.log('❌ Category not found by UUID');
      }
    } else {
      console.log('✅ Category field is already a name, not UUID');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

simpleFix()
  .then(() => {
    console.log('✅ Simple fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Simple fix failed:', error);
    process.exit(1);
  });
