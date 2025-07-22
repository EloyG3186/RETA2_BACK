const { sequelize } = require('../config/database');
const Challenge = require('../models/Challenge');
const Category = require('../models/Category');

async function checkCategoriesStatus() {
  try {
    console.log('🔍 Verificando estado de las categorías...');
    
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida');
    
    // Obtener todas las categorías
    const categories = await Category.findAll();
    console.log(`📊 Total de categorías: ${categories.length}`);
    
    categories.forEach(cat => {
      console.log(`  - ${cat.id}: ${cat.name}`);
    });
    
    // Obtener desafíos con problemas de categoría
    const challenges = await Challenge.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`\n🎯 Últimos 5 desafíos:`);
    for (const challenge of challenges) {
      console.log(`\n📌 Desafío: ${challenge.title}`);
      console.log(`   ID: ${challenge.id}`);
      console.log(`   Category: ${challenge.category}`);
      console.log(`   CategoryId: ${challenge.categoryId}`);
      
      // Verificar si category es un UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(challenge.category);
      if (isUUID) {
        console.log(`   ❌ PROBLEMA: Category contiene UUID`);
        
        // Buscar la categoría por UUID
        const categoryRecord = await Category.findByPk(challenge.category);
        if (categoryRecord) {
          console.log(`   ➡️  Debería ser: ${categoryRecord.name}`);
        }
      } else {
        console.log(`   ✅ Category OK: ${challenge.category}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkCategoriesStatus()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en verificación:', error);
    process.exit(1);
  });
