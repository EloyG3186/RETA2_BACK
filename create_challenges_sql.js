const { sequelize } = require('./src/config/database');

async function createChallengesSQL() {
  try {
    console.log('🚀 Creando 10 desafíos con SQL directo...\n');

    // Obtener IDs de usuarios
    const [users] = await sequelize.query(`
      SELECT id, username FROM users WHERE username IN ('EloyG', 'Gonza25')
    `);
    
    const eloyId = users.find(u => u.username === 'EloyG')?.id;
    const gonzaId = users.find(u => u.username === 'Gonza25')?.id;
    
    if (!eloyId || !gonzaId) {
      console.log('❌ Usuarios no encontrados');
      return;
    }
    
    console.log('✅ Usuarios encontrados');

    // Obtener categorías
    const [categories] = await sequelize.query(`
      SELECT id FROM categories WHERE is_active = true LIMIT 5
    `);
    
    if (categories.length === 0) {
      console.log('❌ No hay categorías activas');
      return;
    }
    
    console.log(`✅ ${categories.length} categorías encontradas`);

    // Crear desafíos uno por uno
    const challenges = [
      { title: 'Desafío de Flexiones', desc: 'Competencia de resistencia: ¿Quién puede hacer más flexiones consecutivas?', fee: 50, prize: 100 },
      { title: 'Maratón de Lectura', desc: 'Reto intelectual: Leer el mayor número de libros en un mes', fee: 30, prize: 60 },
      { title: 'Desafío Culinario', desc: 'Competencia gastronómica: Crear el plato más creativo con ingredientes limitados', fee: 75, prize: 150 },
      { title: 'Reto de Fotografía', desc: 'Capturar la mejor foto de paisaje urbano durante el amanecer', fee: 40, prize: 80 },
      { title: 'Desafío de Programación', desc: 'Resolver algoritmos complejos en el menor tiempo posible', fee: 60, prize: 120 },
      { title: 'Maratón de Ejercicio', desc: 'Completar 10,000 pasos diarios durante una semana', fee: 25, prize: 50 },
      { title: 'Reto de Idiomas', desc: 'Aprender 100 palabras nuevas en inglés en 2 semanas', fee: 35, prize: 70 },
      { title: 'Desafío de Arte', desc: 'Crear una obra de arte original usando solo materiales reciclados', fee: 45, prize: 90 },
      { title: 'Reto de Meditación', desc: 'Meditar 30 minutos diarios durante 21 días consecutivos', fee: 20, prize: 40 },
      { title: 'Desafío de Jardinería', desc: 'Cultivar una planta desde semilla hasta floración', fee: 55, prize: 110 }
    ];

    let created = 0;
    
    for (let i = 0; i < challenges.length; i++) {
      const challenge = challenges[i];
      const categoryId = categories[i % categories.length].id;
      
      try {
        // Generar UUID simple
        const challengeId = 'challenge-' + Date.now() + '-' + i;
        
        await sequelize.query(`
          INSERT INTO challenges (
            id, title, description, creator_id, challenger_id, category_id,
            entry_fee, prize, max_participants, status, start_date, end_date,
            is_private, created_at, updated_at
          ) VALUES (
            '${challengeId}', 
            '${challenge.title}', 
            '${challenge.desc}', 
            '${eloyId}', 
            '${gonzaId}', 
            '${categoryId}',
            ${challenge.fee}, 
            ${challenge.prize}, 
            2, 
            'accepted', 
            NOW(), 
            NOW() + INTERVAL '14 days',
            false, 
            NOW(), 
            NOW()
          )
        `);
        
        created++;
        console.log(`✅ ${created}/10 - "${challenge.title}" creado`);
        
      } catch (error) {
        console.log(`❌ Error en "${challenge.title}": ${error.message}`);
      }
    }
    
    console.log(`\n🎉 Proceso completado: ${created} desafíos creados`);
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  } finally {
    await sequelize.close();
  }
}

createChallengesSQL();
