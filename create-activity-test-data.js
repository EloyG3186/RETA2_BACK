const { sequelize } = require('./src/config/database');
const PointHistory = require('./src/models/PointHistory');
const User = require('./src/models/User');

async function createActivityTestData() {
  try {
    // Conectar a PostgreSQL
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL');

    // Buscar un usuario existente (EloyG)
    const user = await User.findOne({ where: { username: 'EloyG' } });
    if (!user) {
      console.log('❌ Usuario EloyG no encontrado');
      return;
    }

    console.log('👤 Usuario encontrado:', user.username, '- ID:', user.id);

    // Crear datos de actividad reciente (últimos 7 días)
    const activities = [
      {
        userId: user.id,
        points: 10,
        actionType: 'create_challenge',
        reason: 'Creaste un nuevo desafío',
        relatedEntityType: 'Challenge',
        metadata: { challengeTitle: 'Desafío de Programación' },
        previousTotal: 100,
        newTotal: 110,
        previousLevel: 1,
        newLevel: 1,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 día atrás
      },
      {
        userId: user.id,
        points: 20,
        actionType: 'complete_challenge',
        reason: 'Completaste un desafío',
        relatedEntityType: 'Challenge',
        metadata: { challengeTitle: 'Desafío de Algoritmos' },
        previousTotal: 80,
        newTotal: 100,
        previousLevel: 1,
        newLevel: 1,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 días atrás
      },
      {
        userId: user.id,
        points: 30,
        actionType: 'win_challenge',
        reason: 'Ganaste un desafío',
        relatedEntityType: 'Challenge',
        metadata: { challengeTitle: 'Desafío de JavaScript' },
        previousTotal: 50,
        newTotal: 80,
        previousLevel: 1,
        newLevel: 1,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 días atrás
      },
      {
        userId: user.id,
        points: 25,
        actionType: 'judge_challenge',
        reason: 'Actuaste como juez en un desafío',
        relatedEntityType: 'Challenge',
        metadata: { challengeTitle: 'Desafío de React' },
        previousTotal: 25,
        newTotal: 50,
        previousLevel: 1,
        newLevel: 1,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 días atrás
      },
      {
        userId: user.id,
        points: 15,
        actionType: 'complete_judge_task',
        reason: 'Completaste una tarea de juez',
        relatedEntityType: 'Challenge',
        metadata: { challengeTitle: 'Desafío de Node.js' },
        previousTotal: 10,
        newTotal: 25,
        previousLevel: 1,
        newLevel: 1,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 días atrás
      },
      {
        userId: user.id,
        points: 5,
        actionType: 'accept_challenge',
        reason: 'Aceptaste un desafío',
        relatedEntityType: 'Challenge',
        metadata: { challengeTitle: 'Desafío de CSS' },
        previousTotal: 5,
        newTotal: 10,
        previousLevel: 1,
        newLevel: 1,
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) // 6 días atrás
      }
    ];

    // Eliminar actividades existentes del usuario para evitar duplicados
    await PointHistory.destroy({ where: { userId: user.id } });
    console.log('🧹 Actividades anteriores eliminadas');

    // Insertar nuevas actividades
    const createdActivities = await PointHistory.bulkCreate(activities);
    console.log(`✅ ${createdActivities.length} actividades de prueba creadas para ${user.username}`);

    // Mostrar las actividades creadas
    console.log('\n📊 Actividades creadas:');
    createdActivities.forEach((activity, index) => {
      const date = new Date(activity.createdAt);
      console.log(`${index + 1}. ${activity.reason} (+${activity.points} pts) - ${date.toLocaleDateString()}`);
    });

    console.log('\n🎉 Datos de actividad de prueba creados exitosamente');
    console.log('💡 Ahora puedes probar la pestaña "Actividad Reciente" en el perfil');

  } catch (error) {
    console.error('❌ Error creando datos de actividad:', error);
  } finally {
    await sequelize.close();
    console.log('🔌 Desconectado de PostgreSQL');
  }
}

// Ejecutar el script
createActivityTestData();
