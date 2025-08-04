const { User, Category, Challenge, Rule, Participant } = require('./src/models');
const { v4: uuidv4 } = require('uuid');

// Desafíos predefinidos con sus reglas
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

async function createChallenges() {
  try {
    console.log('🚀 Iniciando creación de 10 desafíos...\n');
    
    // Obtener usuarios
    const eloy = await User.findOne({ where: { username: 'EloyG' } });
    const gonza = await User.findOne({ where: { username: 'Gonza25' } });
    
    if (!eloy || !gonza) {
      console.error('❌ No se encontraron los usuarios EloyG o Gonza25');
      return;
    }
    
    console.log(`👤 Creador: ${eloy.username} (${eloy.id})`);
    console.log(`👤 Retador: ${gonza.username} (${gonza.id})\n`);
    
    // Obtener categorías
    const categories = await Category.findAll();
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat.id;
    });
    
    console.log('📂 Categorías disponibles:');
    Object.keys(categoryMap).forEach(name => {
      console.log(`   - ${name}`);
    });
    console.log('');
    
    let createdCount = 0;
    
    // Crear cada desafío
    for (let i = 0; i < challengesData.length; i++) {
      const challengeData = challengesData[i];
      
      try {
        console.log(`📝 Creando desafío ${i + 1}: "${challengeData.title}"`);
        
        // Buscar categoría o usar la primera disponible
        let categoryId = categoryMap[challengeData.category];
        if (!categoryId) {
          categoryId = categories[0]?.id;
          console.log(`   ⚠️  Categoría "${challengeData.category}" no encontrada, usando "${categories[0]?.name}"`);
        }
        
        // Crear el desafío
        const challenge = await Challenge.create({
          id: uuidv4(),
          title: challengeData.title,
          description: challengeData.description,
          creatorId: eloy.id,
          challengerId: gonza.id,
          categoryId: categoryId,
          entryFee: challengeData.betAmount,
          prize: challengeData.prize,
          maxParticipants: 2,
          status: 'accepted',
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          isPrivate: false
        });
        
        console.log(`   ✅ Desafío creado con ID: ${challenge.id}`);
        
        // Crear las reglas
        for (let j = 0; j < challengeData.rules.length; j++) {
          const rule = await Rule.create({
            id: uuidv4(),
            challengeId: challenge.id,
            description: challengeData.rules[j],
            orderIndex: j + 1,
            isMandatory: true
          });
          console.log(`      📋 Regla ${j + 1}: ${rule.description}`);
        }
        
        // Crear participaciones
        await Participant.create({
          id: uuidv4(),
          userId: eloy.id,
          challengeId: challenge.id,
          joinDate: new Date(),
          status: 'active'
        });
        
        await Participant.create({
          id: uuidv4(),
          userId: gonza.id,
          challengeId: challenge.id,
          joinDate: new Date(),
          status: 'active'
        });
        
        console.log(`   👥 Participantes agregados: EloyG y Gonza25\n`);
        createdCount++;
        
      } catch (error) {
        console.error(`   ❌ Error creando desafío "${challengeData.title}":`, error.message);
      }
    }
    
    console.log(`🎉 Proceso completado!`);
    console.log(`✅ Desafíos creados exitosamente: ${createdCount}/10`);
    console.log(`📊 Cada desafío tiene 3 reglas obligatorias`);
    console.log(`👥 Todos los desafíos tienen a EloyG como creador y Gonza25 como retador`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
    process.exit(1);
  }
}

createChallenges();
