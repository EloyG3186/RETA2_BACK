const { sequelize } = require('./src/models');

async function addUserIdColumn() {
  try {
    console.log('Verificando si la columna userId existe...');
    
    // Verificar si la columna existe
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'timeline_events' 
      AND column_name = 'userId';
    `);
    
    if (results.length > 0) {
      console.log('La columna userId ya existe en timeline_events');
    } else {
      console.log('Agregando columna userId a timeline_events...');
      
      await sequelize.query(`
        ALTER TABLE timeline_events 
        ADD COLUMN "userId" UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;
      `);
      
      console.log('✅ Columna userId agregada exitosamente');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addUserIdColumn();
