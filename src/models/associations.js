// Importar modelos
const Category = require('./Category');
const CategoryConfig = require('./CategoryConfig');

// Establecer asociación Category -> CategoryConfig
Category.hasOne(CategoryConfig, {
  foreignKey: 'categoryId',
  as: 'config'
});

// Establecer asociación CategoryConfig -> Category
CategoryConfig.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category'
});

// Nota: Las asociaciones entre User y Wallet ya están definidas en index.js

console.log('✅ Asociaciones de modelos establecidas');

module.exports = {
  setupAssociations: () => {
    console.log('🔄 Configurando asociaciones de modelos...');
    // Las asociaciones ya se establecen al importar este archivo
  }
};
