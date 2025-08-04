const { sequelize } = require('../config/database');

async function addEvidenceSubmissionToEnum() {
  try {
    console.log('Agregando "evidence_submission" temporalmente al enum...');
    
    await sequelize.query(`
      ALTER TYPE "enum_challenges_status" ADD VALUE IF NOT EXISTS 'evidence_submission';
    `);
    
    console.log('✓ Valor "evidence_submission" agregado al enum');
    
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

addEvidenceSubmissionToEnum()
  .then(() => {
    console.log('Script ejecutado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error en el script:', error);
    process.exit(1);
  });
