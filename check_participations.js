const { sequelize } = require('./src/config/database');

async function checkParticipations() {
  try {
    console.log('👤 Verificando participaciones de EloyG...\n');
    
    // Obtener ID de EloyG
    const [users] = await sequelize.query(`
      SELECT id, username FROM users WHERE username = 'EloyG'
    `);
    
    if (users.length === 0) {
      console.log('❌ Usuario EloyG no encontrado');
      return;
    }
    
    const eloyId = users[0].id;
    console.log(`✅ Usuario EloyG encontrado: ${eloyId}`);
    
    // Contar participaciones
    const [participations] = await sequelize.query(`
      SELECT COUNT(*) as total FROM participants WHERE user_id = '${eloyId}'
    `);
    
    console.log(`📊 Total participaciones: ${participations[0].total}`);
    
    // Obtener desafíos con valores
    const [challenges] = await sequelize.query(`
      SELECT 
        c.title, 
        c.entry_fee, 
        c.prize, 
        c.status,
        c.image_url
      FROM challenges c 
      JOIN participants p ON c.id = p.challenge_id 
      WHERE p.user_id = '${eloyId}' 
      ORDER BY c.created_at DESC
      LIMIT 10
    `);
    
    console.log(`\n🎮 Últimos 10 desafíos de EloyG:`);
    challenges.forEach((c, index) => {
      console.log(`${index + 1}. "${c.title}"`);
      console.log(`   💰 Fee: $${c.entry_fee} | Prize: $${c.prize}`);
      console.log(`   📷 Image: ${c.image_url || 'Sin imagen'}`);
      console.log(`   📊 Status: ${c.status}`);
      console.log('');
    });
    
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
  }
}

checkParticipations();
