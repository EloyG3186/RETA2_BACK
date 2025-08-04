const { sequelize } = require('./src/config/database');

// Datos de los desafíos
const challengesData = [
  {
    title: "Reto de 30 Días de Ejercicio",
    description: "Completa 30 días consecutivos de ejercicio físico de al menos 30 minutos diarios",
    category: "Deportes",
    betAmount: 50.00,
    prize: 100.00,
    rules: [
      "Ejercitarse mínimo 30 minutos cada día",
      "Documentar cada sesión con foto o video", 
      "No saltarse más de 1 día en toda la semana"
    ]
  },
  {
    title: "Desafío de Lectura Mensual",
    description: "Leer 4 libros completos en un mes y escribir reseñas de cada uno",
    category: "Educación",
    betAmount: 30.00,
    prize: 60.00,
    rules: [
      "Leer 4 libros completos de mínimo 200 páginas",
      "Escribir una reseña de al menos 500 palabras por libro",
      "Subir foto de cada libro terminado con fecha"
    ]
  },
  {
    title: "Reto Culinario Internacional", 
    description: "Cocinar 15 platos de diferentes países en 3 semanas",
    category: "Gastronomía",
    betAmount: 40.00,
    prize: 80.00,
    rules: [
      "Cocinar platos de al menos 10 países diferentes",
      "Documentar el proceso de cocción con video",
      "Presentar el plato final con ingredientes visibles"
    ]
  },
  {
    title: "Desafío de Programación: App en 7 Días",
    description: "Desarrollar una aplicación móvil funcional en una semana",
    category: "Tecnología",
    betAmount: 75.00,
    prize: 150.00,
    rules: [
      "La app debe tener al menos 3 funcionalidades principales",
      "Código debe estar en repositorio público (GitHub)",
      "Incluir documentación y capturas de pantalla"
    ]
  },
  {
    title: "Reto de Fotografía Urbana",
    description: "Capturar 50 fotos únicas de arte urbano y arquitectura en 2 semanas",
    category: "Arte",
    betAmount: 25.00,
    prize: 50.00,
    rules: [
      "Tomar 50 fotografías originales de arte urbano",
      "Cada foto debe ser de una ubicación diferente", 
      "Incluir descripción del lugar y contexto"
    ]
  },
  {
    title: "Desafío de Meditación y Mindfulness",
    description: "Practicar meditación diaria durante 21 días seguidos",
    category: "Bienestar",
    betAmount: 20.00,
    prize: 40.00,
    rules: [
      "Meditar mínimo 15 minutos cada día",
      "Llevar un diario de reflexiones diarias",
      "Completar al menos 3 técnicas de meditación diferentes"
    ]
  },
  {
    title: "Reto de Emprendimiento: Vender $500 en 10 Días",
    description: "Crear un pequeño negocio y generar $500 en ventas en 10 días",
    category: "Negocios",
    betAmount: 100.00,
    prize: 200.00,
    rules: [
      "Generar mínimo $500 en ventas reales",
      "Documentar estrategia de marketing utilizada",
      "Mostrar comprobantes de venta y testimonios de clientes"
    ]
  },
  {
    title: "Desafío de Idiomas: Conversación Fluida",
    description: "Mantener una conversación de 30 minutos en un idioma extranjero",
    category: "Educación", 
    betAmount: 35.00,
    prize: 70.00,
    rules: [
      "Conversación debe ser con hablante nativo",
      "Duración mínima de 30 minutos ininterrumpidos",
      "Grabar audio de al menos 10 minutos como evidencia"
    ]
  },
  {
    title: "Reto de Sostenibilidad: Cero Residuos",
    description: "Vivir una semana completa sin generar residuos no reciclables",
    category: "Medio Ambiente",
    betAmount: 30.00,
    prize: 60.00,
    rules: [
      "No generar residuos no reciclables durante 7 días",
      "Documentar todas las comidas y compras",
      "Mostrar alternativas sostenibles utilizadas"
    ]
  },
  {
    title: "Desafío Musical: Componer y Grabar",
    description: "Componer, grabar y producir una canción original en 2 semanas",
    category: "Arte",
    betAmount: 45.00,
    prize: 90.00,
    rules: [
      "Canción debe ser 100% original (letra y música)",
      "Duración mínima de 3 minutos",
      "Incluir proceso de creación documentado"
    ]
  }
];

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
      console.error('❌ No se encontraron los usuarios EloyG o Gonza25');
      return;
    }
    
    console.log(`👤 EloyG ID: ${eloyId}`);
    console.log(`👤 Gonza25 ID: ${gonzaId}\n`);
    
    // Obtener categorías
    const [categories] = await sequelize.query(`
      SELECT id, name FROM categories WHERE is_active = true
    `);
    
    console.log('📂 Categorías disponibles:');
    categories.forEach(cat => console.log(`   - ${cat.name}`));
    console.log('');
    
    let createdCount = 0;
    
    for (let i = 0; i < challengesData.length; i++) {
      const challenge = challengesData[i];
      
      // Buscar categoría o usar la primera
      let categoryId = categories.find(c => c.name === challenge.category)?.id;
      if (!categoryId) {
        categoryId = categories[0]?.id;
      }
      
      const challengeId = require('crypto').randomUUID();
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      
      try {
        // Crear desafío
        await sequelize.query(`
          INSERT INTO challenges (
            id, title, description, creator_id, challenger_id, category_id,
            bet_amount, prize, max_participants, status, start_date, end_date,
            is_private, created_at, updated_at
          ) VALUES (
            '${challengeId}', '${challenge.title.replace(/'/g, "''")}', 
            '${challenge.description.replace(/'/g, "''")}', '${eloyId}', '${gonzaId}',
            '${categoryId}', ${challenge.betAmount}, ${challenge.prize}, 2, 'accepted',
            '${startDate}', '${endDate}', false, NOW(), NOW()
          )
        `);
        
        console.log(`✅ Desafío ${i + 1}: "${challenge.title}"`);
        
        // Crear reglas
        for (let j = 0; j < challenge.rules.length; j++) {
          const ruleId = require('crypto').randomUUID();
          await sequelize.query(`
            INSERT INTO rules (
              id, challenge_id, description, order_index, is_mandatory, created_at, updated_at
            ) VALUES (
              '${ruleId}', '${challengeId}', '${challenge.rules[j].replace(/'/g, "''")}',
              ${j + 1}, true, NOW(), NOW()
            )
          `);
          console.log(`   📋 Regla ${j + 1}: ${challenge.rules[j]}`);
        }
        
        // Crear participaciones
        const participantId1 = require('crypto').randomUUID();
        const participantId2 = require('crypto').randomUUID();
        
        await sequelize.query(`
          INSERT INTO participants (
            id, user_id, challenge_id, join_date, status, created_at, updated_at
          ) VALUES 
          ('${participantId1}', '${eloyId}', '${challengeId}', NOW(), 'active', NOW(), NOW()),
          ('${participantId2}', '${gonzaId}', '${challengeId}', NOW(), 'active', NOW(), NOW())
        `);
        
        console.log(`   👥 Participantes: EloyG y Gonza25\n`);
        createdCount++;
        
      } catch (error) {
        console.error(`   ❌ Error en desafío "${challenge.title}":`, error.message);
      }
    }
    
    console.log(`🎉 Proceso completado!`);
    console.log(`✅ Desafíos creados: ${createdCount}/10`);
    console.log(`📋 Cada desafío tiene 3 reglas obligatorias`);
    console.log(`👥 EloyG como creador, Gonza25 como retador`);
    
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
  }
}

createChallengesSQL();
