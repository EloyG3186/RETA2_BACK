const { sequelize } = require('./src/config/database');
const Category = require('./src/models/Category');
const CategoryConfig = require('./src/models/CategoryConfig');
const { QueryTypes } = require('sequelize');

async function diagnosticarCategoryConfigs() {
  try {
    // 1. Comprobar conexión a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida correctamente.');

    // 2. Verificar si la tabla category_configs existe
    const tablas = await sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'", {
      type: QueryTypes.SELECT
    });
    console.log('📋 Tablas en la base de datos:');
    tablas.forEach(t => console.log(`- ${t.tablename}`));

    // 3. Consultar la estructura de la tabla category_configs
    const estructura = await sequelize.query(
      "SELECT column_name, data_type, character_maximum_length, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'category_configs'",
      { type: QueryTypes.SELECT }
    );
    console.log('\n📊 Estructura de la tabla category_configs:');
    console.table(estructura);

    // 4. Consultar los índices de la tabla category_configs
    const indices = await sequelize.query(
      `SELECT 
        indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'category_configs'`,
      { type: QueryTypes.SELECT }
    );
    console.log('\n🔑 Índices de la tabla category_configs:');
    console.table(indices);

    // 5. Consultar restricciones de unicidad
    const restricciones = await sequelize.query(
      `SELECT 
        conname as restriccion, 
        pg_get_constraintdef(oid) as definicion
      FROM pg_constraint 
      WHERE conrelid = 'category_configs'::regclass`,
      { type: QueryTypes.SELECT }
    );
    console.log('\n🛡️ Restricciones de la tabla category_configs:');
    console.table(restricciones);

    // 6. Consultar datos existentes en category_configs con SQL directo
    const configsSQL = await sequelize.query("SELECT * FROM category_configs", {
      type: QueryTypes.SELECT
    });
    console.log('\n📝 Configuraciones existentes (SQL):');
    console.table(configsSQL);

    // 7. Consultar datos existentes usando el modelo Sequelize
    const configsSequelize = await CategoryConfig.findAll({
      include: [
        {
          model: Category,
          as: 'category'
        }
      ]
    });
    console.log('\n📝 Configuraciones existentes (Sequelize):');
    console.log(JSON.stringify(configsSequelize, null, 2));

    // 8. Verificar foreign key referenciada
    const foreignKeys = await sequelize.query(
      `SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu 
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'category_configs'`,
      { type: QueryTypes.SELECT }
    );
    console.log('\n🔄 Foreign Keys de category_configs:');
    console.table(foreignKeys);

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  } finally {
    // Cerrar la conexión
    await sequelize.close();
    console.log('🔌 Conexión cerrada.');
  }
}

// Ejecutar diagnóstico
diagnosticarCategoryConfigs();
