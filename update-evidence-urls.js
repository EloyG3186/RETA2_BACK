const { sequelize } = require('./src/config/database');
const { Evidence } = require('./src/models');

async function updateEvidenceUrls() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión establecida');
    
    // Buscar evidencias con URLs incorrectas
    const evidences = await Evidence.findAll({
      where: {
        fileUrl: {
          [sequelize.Sequelize.Op.like]: 'https://challenge-friends-storage.example.com%'
        }
      }
    });
    
    console.log(`📊 Encontradas ${evidences.length} evidencias con URLs incorrectas`);
    
    for (const evidence of evidences) {
      console.log(`🔍 Evidencia ${evidence.id}: ${evidence.fileUrl}`);
      
      // Extraer el nombre del archivo de la URL incorrecta
      const urlParts = evidence.fileUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      
      // Generar la nueva URL correcta
      const newUrl = `/uploads/evidences/${evidence.challengeId}/${filename}`;
      
      await evidence.update({ fileUrl: newUrl });
      console.log(`✅ Actualizada a: ${newUrl}`);
    }
    
    console.log('🎉 Todas las URLs han sido actualizadas');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

updateEvidenceUrls();
