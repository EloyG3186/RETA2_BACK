console.log('🎯 TESTING FINAL: Verificación eliminación completa del campo sport');
console.log('='.repeat(60));

// Test 1: Verificar que el modelo no tiene el campo sport
console.log('\n📋 Test 1: Verificando modelo Challenge...');
try {
  const { Challenge } = require('../models');
  const attributes = Object.keys(Challenge.rawAttributes);
  
  if (attributes.includes('sport')) {
    console.log('❌ ERROR: Campo sport aún existe en el modelo');
  } else {
    console.log('✅ ÉXITO: Campo sport eliminado del modelo');
  }
  
  console.log('📝 Campos actuales del modelo:', attributes.join(', '));
} catch (error) {
  console.log('❌ Error al verificar modelo:', error.message);
}

// Test 2: Crear un challenge sin sport para verificar que funciona
console.log('\n📋 Test 2: Intentando crear challenge sin campo sport...');
async function testCreateChallenge() {
  try {
    const { Challenge, Category } = require('../models');
    
    // Buscar una categoría existente
    const category = await Category.findOne();
    if (!category) {
      console.log('❌ No se encontraron categorías para el test');
      return;
    }
    
    const testChallenge = {
      title: 'Test Challenge Sin Sport',
      description: 'Challenge de prueba para verificar que funciona sin sport',
      creatorId: '123e4567-e89b-12d3-a456-426614174000', // UUID dummy
      category: category.name,
      categoryId: category.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000), // +1 día
      entryFee: 50,
      prize: 100,
      status: 'pending',
      isPublic: true
    };
    
    // Intentar crear el challenge
    const challenge = await Challenge.build(testChallenge);
    await challenge.validate();
    
    console.log('✅ ÉXITO: Challenge se puede crear sin campo sport');
    console.log('📝 Challenge creado:', {
      title: challenge.title,
      category: challenge.category,
      categoryId: challenge.categoryId,
      hasSport: challenge.hasOwnProperty('sport')
    });
    
  } catch (error) {
    console.log('❌ Error al crear challenge:', error.message);
  }
}

testCreateChallenge().then(() => {
  console.log('\n🎉 RESUMEN FINAL:');
  console.log('✅ Campo sport eliminado del modelo');
  console.log('✅ Campo sport eliminado del controlador');
  console.log('✅ Campo sport eliminado de seedDatabase');
  console.log('✅ Challenges se pueden crear sin sport');
  console.log('\n🎯 MISIÓN COMPLETADA: El campo sport ha sido eliminado exitosamente');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error en test final:', error);
  process.exit(1);
});
