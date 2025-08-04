const { User, Category } = require('./src/models');

async function getData() {
  try {
    console.log('🔍 Obteniendo datos para crear desafíos...\n');
    
    // Obtener usuarios
    const eloy = await User.findOne({ where: { username: 'EloyG' } });
    const gonza = await User.findOne({ where: { username: 'Gonza25' } });
    
    console.log('👥 USUARIOS:');
    console.log(`EloyG ID: ${eloy ? eloy.id : 'No encontrado'}`);
    console.log(`Gonza25 ID: ${gonza ? gonza.id : 'No encontrado'}\n`);
    
    // Obtener categorías
    const categories = await Category.findAll();
    console.log('📂 CATEGORÍAS DISPONIBLES:');
    categories.forEach(cat => {
      console.log(`- ${cat.name} (ID: ${cat.id})`);
    });
    
    console.log(`\n✅ Total categorías: ${categories.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getData();
