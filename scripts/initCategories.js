const { Category } = require('../src/models');
const { sequelize } = require('../src/config/database');

// Categoru00edas iniciales basadas en las que estu00e1n en el frontend
const initialCategories = [
  { name: 'Fitness', description: 'Desafu00edos relacionados con ejercicio fu00edsico y bienestar', icon: 'fitness' },
  { name: 'Deportes', description: 'Desafu00edos relacionados con actividades deportivas', icon: 'sports' },
  { name: 'Videojuegos', description: 'Desafu00edos relacionados con videojuegos y eSports', icon: 'gaming' },
  { name: 'Aprendizaje', description: 'Desafu00edos relacionados con educaciu00f3n y desarrollo de habilidades', icon: 'learning' },
  { name: 'Comida', description: 'Desafu00edos relacionados con cocina y gastronomu00eda', icon: 'food' },
  { name: 'Otro', description: 'Otros tipos de desafu00edos', icon: 'other' },
];

// Funciu00f3n para inicializar las categoru00edas
async function initializeCategories() {
  try {
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('Conexiu00f3n a la base de datos establecida.');
    
    // Sincronizar el modelo Category
    await Category.sync({ alter: true });
    
    // Verificar si ya existen categoru00edas
    const count = await Category.count();
    
    if (count > 0) {
      console.log(`Ya existen ${count} categoru00edas en la base de datos. No se realizaru00e1n cambios.`);
      process.exit(0);
    }
    
    // Insertar las categoru00edas iniciales
    const createdCategories = await Category.bulkCreate(initialCategories);
    
    console.log(`Se han creado ${createdCategories.length} categoru00edas:`);
    createdCategories.forEach(category => {
      console.log(`- ${category.name} (ID: ${category.id})`);
    });
    
    console.log('Inicializaciu00f3n de categoru00edas completada exitosamente.');
  } catch (error) {
    console.error('Error al inicializar las categoru00edas:', error);
  } finally {
    // Cerrar la conexiu00f3n
    await sequelize.close();
    process.exit(0);
  }
}

// Ejecutar la funciu00f3n
initializeCategories();
