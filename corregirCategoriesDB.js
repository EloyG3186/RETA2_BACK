const { sequelize } = require('./src/config/database');
const { QueryTypes } = require('sequelize');

async function corregirTablasCategorias() {
  console.log('🔧 Iniciando corrección de tablas de categorías y configuraciones...');

  try {
    // 1. Verificar si existen ambas tablas
    const tablas = await sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND (tablename = 'categories' OR tablename = 'Categories')", {
      type: QueryTypes.SELECT
    });
    
    const tablasExistentes = tablas.map(t => t.tablename);
    console.log(`📋 Tablas encontradas: ${tablasExistentes.join(', ')}`);

    // Si ambas tablas existen, necesitamos consolidarlas
    if (tablasExistentes.includes('categories') && tablasExistentes.includes('Categories')) {
      console.log('⚠️ Se encontraron dos tablas de categorías (categories y Categories). Consolidando...');

      // 2. Comprobar si hay datos en la tabla 'Categories'
      const categoriasCapital = await sequelize.query("SELECT * FROM \"Categories\"", {
        type: QueryTypes.SELECT
      });
      
      console.log(`📊 Encontradas ${categoriasCapital.length} categorías en la tabla "Categories" (mayúsculas)`);

      // 3. Si hay datos en la tabla 'Categories', migrar a 'categories'
      if (categoriasCapital.length > 0) {
        console.log('🔄 Migrando datos de "Categories" a "categories"...');
        
        // Por cada categoría en 'Categories', insertarla en 'categories' si no existe
        for (const cat of categoriasCapital) {
          // Verificar si ya existe en 'categories'
          const existe = await sequelize.query(`SELECT * FROM categories WHERE id = '${cat.id}'`, {
            type: QueryTypes.SELECT
          });

          if (existe.length === 0) {
            // No existe, insertar
            await sequelize.query(`
              INSERT INTO categories (id, name, description, icon, "isActive", "createdAt", "updatedAt")
              VALUES ('${cat.id}', '${cat.name.replace("'", "''")}', 
                     ${cat.description ? `'${cat.description.replace("'", "''")}'` : 'NULL'}, 
                     ${cat.icon ? `'${cat.icon.replace("'", "''")}'` : 'NULL'}, 
                     ${cat.isActive}, 
                     '${cat.createdAt.toISOString()}', 
                     '${cat.updatedAt.toISOString()}')
            `, { type: QueryTypes.INSERT });
            console.log(`✅ Migrada categoría "${cat.name}" con ID ${cat.id}`);
          } else {
            console.log(`⚠️ La categoría "${cat.name}" con ID ${cat.id} ya existe en 'categories', omitiendo`);
          }
        }
      }

      // 4. Eliminar las restricciones de clave foránea que apuntan a 'Categories'
      console.log('🔄 Eliminando restricción de clave foránea que apunta a "Categories"...');
      try {
        await sequelize.query('ALTER TABLE category_configs DROP CONSTRAINT IF EXISTS category_configs_category_id_fkey', {
          type: QueryTypes.RAW
        });
        console.log('✅ Restricción category_configs_category_id_fkey eliminada o no existía');
      } catch (error) {
        console.error('❌ Error al eliminar restricción category_configs_category_id_fkey:', error.message);
      }
      
      // 5. Eliminar la tabla 'Categories' si ya no es necesaria
      try {
        await sequelize.query('DROP TABLE IF EXISTS "Categories"', {
          type: QueryTypes.RAW
        });
        console.log('✅ Tabla "Categories" eliminada');
      } catch (error) {
        console.error('❌ Error al eliminar la tabla "Categories":', error.message);
      }
    } else if (!tablasExistentes.includes('categories')) {
      console.log('⚠️ No se encontró la tabla "categories" (minúsculas), solo existe "Categories"');
      console.log('🔄 Renombrando tabla "Categories" a "categories"...');
      
      // Renombrar la tabla
      await sequelize.query('ALTER TABLE "Categories" RENAME TO categories', {
        type: QueryTypes.RAW
      });
      console.log('✅ Tabla renombrada exitosamente');
    }
    
    // 6. Verificar que la restricción de clave foránea apunte a la tabla correcta
    console.log('🔍 Verificando restricciones de clave foránea en category_configs...');
    const restricciones = await sequelize.query(
      `SELECT 
        conname as restriccion, 
        pg_get_constraintdef(oid) as definicion
      FROM pg_constraint 
      WHERE conrelid = 'category_configs'::regclass`,
      { type: QueryTypes.SELECT }
    );
    
    console.log('📋 Restricciones actuales:');
    restricciones.forEach(r => {
      console.log(`- ${r.restriccion}: ${r.definicion}`);
    });

    // 7. Si no existe la restricción correcta, crearla
    const tieneRestriccionCorrecta = restricciones.some(r => 
      r.definicion.includes('REFERENCES categories(id)')
    );
    
    if (!tieneRestriccionCorrecta) {
      console.log('🔄 Creando restricción de clave foránea correcta...');
      try {
        // Primero eliminar cualquier índice único que pueda causar problemas
        await sequelize.query('DROP INDEX IF EXISTS category_configs_category_id', {
          type: QueryTypes.RAW
        });
        
        // Luego crear la restricción correcta
        await sequelize.query(
          'ALTER TABLE category_configs ADD CONSTRAINT category_configs_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id)',
          { type: QueryTypes.RAW }
        );
        console.log('✅ Restricción de clave foránea creada correctamente');
      } catch (error) {
        console.error('❌ Error al crear restricción de clave foránea:', error.message);
      }
    }

    console.log('🎉 Proceso de corrección completado');
  } catch (error) {
    console.error('❌ Error durante el proceso de corrección:', error);
  } finally {
    await sequelize.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar la corrección
corregirTablasCategorias();
