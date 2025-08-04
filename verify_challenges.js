const { sequelize } = require('./src/config/database');

async function verifyChallenges() {
  try {
    console.log('🔍 Verificando desafíos creados...\n');
    
    // Contar desafíos totales
    const [totalResult] = await sequelize.query(`
      SELECT COUNT(*) as total FROM challenges
    `);
    console.log(`📊 Total de desafíos en la base de datos: ${totalResult[0].total}`);
    
    // Verificar desafíos de EloyG y Gonza25
    const [challengesResult] = await sequelize.query(`
      SELECT 
        c.id,
        c.title,
        c.entry_fee,
        c.prize,
        creator.username as creator_username,
        challenger.username as challenger_username,
        (SELECT COUNT(*) FROM rules WHERE challenge_id = c.id) as rules_count,
        (SELECT COUNT(*) FROM participants WHERE challenge_id = c.id) as participants_count
      FROM challenges c
      LEFT JOIN users creator ON c.creator_id = creator.id
      LEFT JOIN users challenger ON c.challenger_id = challenger.id
      WHERE creator.username = 'EloyG' OR challenger.username = 'Gonza25'
      ORDER BY c.created_at DESC
    `);
    
    if (challengesResult.length === 0) {
      console.log('❌ No se encontraron desafíos de EloyG y Gonza25');
    } else {
      console.log(`\n✅ ${challengesResult.length} desafíos encontrados:\n`);
      
      challengesResult.forEach((challenge, index) => {
        console.log(`${index + 1}. "${challenge.title}"`);
        console.log(`   💰 Entry Fee: ${challenge.entry_fee} | Prize: ${challenge.prize}`);
        console.log(`   👥 Creator: ${challenge.creator_username} | Challenger: ${challenge.challenger_username}`);
        console.log(`   📋 Rules: ${challenge.rules_count} | Participants: ${challenge.participants_count}`);
        console.log('');
      });
    }
    
    // Verificar reglas
    const [rulesResult] = await sequelize.query(`
      SELECT COUNT(*) as total FROM rules r
      JOIN challenges c ON r.challenge_id = c.id
      JOIN users creator ON c.creator_id = creator.id
      WHERE creator.username = 'EloyG'
    `);
    console.log(`📋 Total de reglas creadas: ${rulesResult[0].total}`);
    
    // Verificar participantes
    const [participantsResult] = await sequelize.query(`
      SELECT COUNT(*) as total FROM participants p
      JOIN challenges c ON p.challenge_id = c.id
      JOIN users creator ON c.creator_id = creator.id
      WHERE creator.username = 'EloyG'
    `);
    console.log(`👥 Total de participantes: ${participantsResult[0].total}`);
    
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
  }
}

verifyChallenges();
