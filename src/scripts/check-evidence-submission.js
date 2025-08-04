const { sequelize } = require('../config/database');

async function checkEvidenceSubmission() {
  try {
    console.log('Verificando registros con status "evidence_submission"...');
    
    const [results] = await sequelize.query(`
      SELECT COUNT(*) as count FROM "challenges" WHERE "status" = 'evidence_submission';
    `);
    
    console.log(`Registros con status "evidence_submission": ${results[0].count}`);
    
    if (results[0].count > 0) {
      console.log('Obteniendo algunos ejemplos:');
      const [examples] = await sequelize.query(`
        SELECT id, title, status, "createdAt" FROM "challenges" 
        WHERE "status" = 'evidence_submission' 
        LIMIT 5;
      `);
      console.log('Ejemplos:', examples);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

checkEvidenceSubmission()
  .then(() => {
    console.log('Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error en el script:', error);
    process.exit(1);
  });
