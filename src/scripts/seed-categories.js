const { sequelize, Category } = require('../models');

/**
 * Script to seed default categories in the database
 */

const defaultCategories = [
  {
    name: 'Deportes',
    description: 'Desafíos relacionados con actividades deportivas y ejercicio físico',
    icon: '🏃',
    isActive: true
  },
  {
    name: 'Estudio', 
    description: 'Desafíos educativos y de aprendizaje',
    icon: '📚',
    isActive: true
  },
  {
    name: 'Salud',
    description: 'Desafíos relacionados con bienestar y salud',
    icon: '💪',
    isActive: true
  },
  {
    name: 'Creatividad',
    description: 'Desafíos artísticos y creativos', 
    icon: '🎨',
    isActive: true
  },
  {
    name: 'Videojuegos',
    description: 'Desafíos relacionados con gaming y videojuegos',
    icon: '🎮',
    isActive: true
  },
  {
    name: 'Tecnología',
    description: 'Desafíos de desarrollo, programación y tecnología',
    icon: '💻',
    isActive: true
  }
];

async function seedCategories() {
  console.log('🌱 Starting category seeding...');
  
  // Test database connection
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
  
  try {
    let createdCount = 0;
    let existingCount = 0;
    
    for (const categoryData of defaultCategories) {
      // Check if category already exists
      const existingCategory = await Category.findOne({
        where: { name: categoryData.name }
      });
      
      if (existingCategory) {
        console.log(`⏭️  Category "${categoryData.name}" already exists`);
        existingCount++;
      } else {
        // Create new category
        await Category.create(categoryData);
        console.log(`✅ Created category: ${categoryData.name}`);
        createdCount++;
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Created: ${createdCount} categories`);
    console.log(`   ⏭️  Already existed: ${existingCount} categories`);
    console.log(`\n🎉 Category seeding completed!`);
    
  } catch (error) {
    console.error('❌ Error during category seeding:', error);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  seedCategories()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { seedCategories };
