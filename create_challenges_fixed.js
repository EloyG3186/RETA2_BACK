const { sequelize } = require('./src/config/database');
const { v4: uuidv4 } = require('uuid');

const challengesData = [
  {
    title: "Desafío de Flexiones",
    description: "Competencia de resistencia: ¿Quién puede hacer más flexiones consecutivas?",
    entryFee: 50,
    prize: 100,
    rules: [
      "Las flexiones deben ser completas (pecho tocando el suelo)",
      "No se permite descanso entre flexiones",
      "Se debe grabar en video toda la secuencia"
    ]
  },
  {
    title: "Maratón de Lectura",
    description: "Reto intelectual: Leer el mayor número de libros en un mes",
    entryFee: 30,
    prize: 60,
    rules: [
      "Los libros deben tener mínimo 200 páginas",
      "Presentar resumen de cada libro leído",
      "Subir foto de la portada y última página"
    ]
  },
  {
    title: "Desafío Culinario",
    description: "Competencia gastronómica: Crear el plato más creativo con ingredientes limitados",
    entryFee: 75,
    prize: 150,
    rules: [
      "Solo se pueden usar 5 ingredientes principales",
      "Tiempo límite de 2 horas para cocinar",
      "Documentar todo el proceso con fotos"
    ]
  },
  {
    title: "Reto de Fotografía",
    description: "Capturar la mejor foto de paisaje urbano durante el amanecer",
    entryFee: 40,
    prize: 80,
    rules: [
      "La foto debe ser tomada entre 5:30 y 7:00 AM",
      "No se permite edición digital excesiva",
      "Incluir datos EXIF de la cámara"
    ]
  },
  {
    title: "Desafío de Programación",
    description: "Resolver algoritmos complejos en el menor tiempo posible",
    entryFee: 60,
    prize: 120,
    rules: [
      "Usar solo lenguajes de programación permitidos",
      "Código debe ser funcional y optimizado",
      "Documentar la solución paso a paso"
    ]
  },
  {
    title: "Maratón de Ejercicio",
    description: "Completar 10,000 pasos diarios durante una semana",
    entryFee: 25,
    prize: 50,
    rules: [
      "Usar aplicación de seguimiento verificada",
      "Subir captura diaria del contador",
      "No se permiten pasos artificiales"
    ]
  },
  {
    title: "Reto de Idiomas",
    description: "Aprender 100 palabras nuevas en inglés en 2 semanas",
    entryFee: 35,
    prize: 70,
    rules: [
      "Usar aplicación de idiomas reconocida",
      "Grabar pronunciación de 20 palabras aleatorias",
      "Presentar examen de vocabulario al final"
    ]
  },
  {
    title: "Desafío de Arte",
    description: "Crear una obra de arte original usando solo materiales reciclados",
    entryFee: 45,
    prize: 90,
    rules: [
      "Todos los materiales deben ser reciclados",
      "Documentar el proceso creativo",
      "La obra debe tener mínimo 30cm x 30cm"
    ]
  },
  {
    title: "Reto de Meditación",
    description: "Meditar 30 minutos diarios durante 21 días consecutivos",
    entryFee: 20,
    prize: 40,
    rules: [
      "Usar aplicación de meditación con seguimiento",
      "Escribir reflexión diaria de 100 palabras",
      "No se permiten días de descanso"
    ]
  },
  {
    title: "Desafío de Jardinería",
    description: "Cultivar una planta desde semilla hasta floración",
    entryFee: 55,
    prize: 110,
    rules: [
      "Documentar crecimiento con fotos semanales",
      "Usar solo métodos orgánicos de cultivo",
      "La planta debe florecer para ganar"
    ]
  }
];

async function createChallenges() {
  try {
    console.log('🚀 Iniciando creación de 10 desafíos...\n');

    // Obtener usuarios
    const [users] = await sequelize.query(`
      SELECT id, username, full_name 
      FROM users 
      WHERE username IN ('EloyG', 'Gonza25')
    `);
    
    const eloy = users.find(u => u.username === 'EloyG');
    const gonza = users.find(u => u.username === 'Gonza25');
    
    if (!eloy || !gonza) {
      console.error('❌ No se encontraron los usuarios EloyG y Gonza25');
      return;
    }
    
    console.log(`✅ Usuarios encontrados:`);
    console.log(`   - Creador: ${eloy.full_name} (@${eloy.username})`);
    console.log(`   - Retador: ${gonza.full_name} (@${gonza.username})\n`);

    // Obtener categorías
    const [categories] = await sequelize.query(`
      SELECT id, name FROM categories WHERE "isActive" = true LIMIT 5
    `);
    
    console.log(`✅ ${categories.length} categorías encontradas\n`);

    let createdCount = 0;

    for (let i = 0; i < challengesData.length; i++) {
      const challengeData = challengesData[i];
      const category = categories[i % categories.length];
      
      try {
        // Crear desafío
        const challengeId = uuidv4();
        
        await sequelize.query(`
          INSERT INTO challenges (
            id, title, description, creator_id, challenger_id, category_id,
            entry_fee, prize, max_participants, status, start_date, end_date,
            is_private, created_at, updated_at
          ) VALUES (
            :id, :title, :description, :creatorId, :challengerId, :categoryId,
            :entryFee, :prize, 2, 'accepted', NOW(), NOW() + INTERVAL '14 days',
            false, NOW(), NOW()
          )
        `, {
          replacements: {
            id: challengeId,
            title: challengeData.title,
            description: challengeData.description,
            creatorId: eloy.id,
            challengerId: gonza.id,
            categoryId: category.id,
            entryFee: challengeData.entryFee,
            prize: challengeData.prize
          }
        });

        // Crear reglas
        for (let j = 0; j < challengeData.rules.length; j++) {
          await sequelize.query(`
            INSERT INTO rules (
              id, challenge_id, description, order_index, is_mandatory, created_at, updated_at
            ) VALUES (
              :id, :challengeId, :description, :orderIndex, true, NOW(), NOW()
            )
          `, {
            replacements: {
              id: uuidv4(),
              challengeId: challengeId,
              description: challengeData.rules[j],
              orderIndex: j + 1
            }
          });
        }

        // Crear participantes
        await sequelize.query(`
          INSERT INTO participants (
            id, user_id, challenge_id, join_date, status, created_at, updated_at
          ) VALUES 
          (:creatorParticipantId, :creatorId, :challengeId, NOW(), 'accepted', NOW(), NOW()),
          (:challengerParticipantId, :challengerId, :challengeId, NOW(), 'accepted', NOW(), NOW())
        `, {
          replacements: {
            creatorParticipantId: uuidv4(),
            challengerParticipantId: uuidv4(),
            creatorId: eloy.id,
            challengerId: gonza.id,
            challengeId: challengeId
          }
        });

        createdCount++;
        console.log(`✅ ${createdCount}/10 - "${challengeData.title}" creado con ${challengeData.rules.length} reglas`);
        
      } catch (error) {
        console.error(`❌ Error creando desafío "${challengeData.title}":`, error.message);
      }
    }

    console.log(`\n🎉 Proceso completado: ${createdCount} desafíos creados exitosamente`);
    console.log(`📊 Total de reglas creadas: ${createdCount * 3}`);
    console.log(`👥 Participantes agregados: ${createdCount * 2}`);

  } catch (error) {
    console.error('❌ Error general:', error.message);
  } finally {
    await sequelize.close();
  }
}

createChallenges();
