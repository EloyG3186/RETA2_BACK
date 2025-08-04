const { sequelize } = require('./src/models');

async function fixUserIdColumn() {
  try {
    console.log('🔍 Verificando estructura actual de timeline_events...');
    
    // Verificar columnas existentes
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'timeline_events'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Columnas actuales en timeline_events:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    
    // Verificar si userId existe
    const userIdExists = columns.some(col => col.column_name === 'userId' || col.column_name === 'user_id');
    
    if (!userIdExists) {
      console.log('❌ La columna userId/user_id NO existe. Agregándola...');
      
      // Agregar la columna
      await sequelize.query(`
        ALTER TABLE timeline_events 
        ADD COLUMN "userId" UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;
      `);
      
      console.log('✅ Columna userId agregada exitosamente');
      
      // Verificar nuevamente
      const [newColumns] = await sequelize.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'timeline_events'
        ORDER BY ordinal_position;
      `);
      
      console.log('📋 Columnas después del cambio:');
      newColumns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });
      
    } else {
      console.log('✅ La columna userId ya existe');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

fixUserIdColumn();
