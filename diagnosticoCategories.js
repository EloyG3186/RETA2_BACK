const { sequelize } = require('./src/config/database');
const { Category } = require('./src/models');

async function diagnoseCategories() {
  try {
    console.log('Iniciando diagnóstico de categorías...');
    
    // 1. Verificar conexión a la base de datos
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');
    
    // 2. Consultar el nombre real de la tabla en la base de datos
    const [results] = await sequelize.query(`
      SELECT tablename FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public'
    `);
    console.log('Tablas en la base de datos:', results);
    
    // 3. Verificar si la tabla de categorías existe
    const categoryTable = results.find(r => 
      r.tablename.toLowerCase() === 'categories' || 
      r.tablename.toLowerCase() === 'category' ||
      r.tablename.toLowerCase().includes('categor')
    );
    console.log('Tabla de categorías encontrada:', categoryTable);
    
    // 4. Consulta SQL directa para buscar categorías
    if (categoryTable) {
      const [categories] = await sequelize.query(`
        SELECT * FROM "${categoryTable.tablename}"
      `);
      console.log(`Categorías encontradas mediante SQL (${categories.length}):`, categories);
    }
    
    // 5. Consulta mediante Sequelize
    const categoriesSequelize = await Category.findAll();
    console.log(`Categorías encontradas mediante Sequelize (${categoriesSequelize.length}):`, categoriesSequelize);
    
    // 6. Verificar si hay diferencia de esquemas
    const [schemas] = await sequelize.query(`
      SELECT nspname FROM pg_catalog.pg_namespace
      WHERE nspname !~ '^pg_' AND nspname <> 'information_schema'
    `);
    console.log('Esquemas disponibles:', schemas);
    
    // 7. Consulta en todos los esquemas disponibles
    for (const schema of schemas) {
      try {
        const [tablesInSchema] = await sequelize.query(`
          SELECT tablename FROM pg_catalog.pg_tables 
          WHERE schemaname = '${schema.nspname}'
        `);
        console.log(`Tablas en esquema ${schema.nspname}:`, tablesInSchema);
        
        const categoryTableInSchema = tablesInSchema.find(r => 
          r.tablename.toLowerCase().includes('categor')
        );
        
        if (categoryTableInSchema) {
          const [categoriesInSchema] = await sequelize.query(`
            SELECT * FROM "${schema.nspname}"."${categoryTableInSchema.tablename}"
          `);
          console.log(`Categorías en esquema ${schema.nspname}.${categoryTableInSchema.tablename} (${categoriesInSchema.length}):`, 
            categoriesInSchema
          );
        }
      } catch (e) {
        console.error(`Error consultando esquema ${schema.nspname}:`, e.message);
      }
    }
    
    console.log('Diagnóstico completado.');
  } catch (error) {
    console.error('Error durante el diagnóstico:', error);
  } finally {
    await sequelize.close();
  }
}

diagnoseCategories();
