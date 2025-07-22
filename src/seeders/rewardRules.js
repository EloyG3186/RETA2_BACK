const { RewardRule } = require('../models');

/**
 * Inicializar las reglas de recompensas en la base de datos
 */
const initializeRewardRules = async () => {
  try {
    console.log('Iniciando seeder de reglas de recompensas...');
    
    // Verificar conexión a la base de datos
    console.log('Verificando conexión a la base de datos...');
    await RewardRule.findOne(); // Test connection
    console.log('✅ Conexión a la base de datos exitosa');

    // Datos de las reglas de recompensas
    const rewardRulesData = [
      {
        actionType: 'create_challenge',
        title: 'Crear un desafío',
        description: 'Gana puntos por crear un nuevo desafío para la comunidad',
        points: 10,
        icon: 'FaPlus',
        color: 'cd-text-green-500',
        displayOrder: 1
      },
      {
        actionType: 'accept_challenge',
        title: 'Aceptar un desafío',
        description: 'Gana puntos por aceptar participar en un desafío',
        points: 5,
        icon: 'FaHandshake',
        color: 'cd-text-blue-500',
        displayOrder: 2
      },
      {
        actionType: 'complete_challenge',
        title: 'Completar un desafío',
        description: 'Gana puntos por completar exitosamente un desafío',
        points: 20,
        icon: 'FaCheck',
        color: 'cd-text-purple-500',
        displayOrder: 3
      },
      {
        actionType: 'win_challenge',
        title: 'Ganar un desafío',
        description: 'Gana puntos adicionales por ser el ganador de un desafío',
        points: 30,
        icon: 'FaTrophy',
        color: 'cd-text-yellow-500',
        displayOrder: 4
      },
      {
        actionType: 'judge_challenge',
        title: 'Ser juez',
        description: 'Gana puntos por ser juez y evaluar desafíos',
        points: 25,
        icon: 'FaGavel',
        color: 'cd-text-orange-500',
        displayOrder: 5
      },
      {
        actionType: 'complete_judge_task',
        title: 'Completar tarea como juez',
        description: 'Gana puntos por completar una tarea de evaluación como juez',
        points: 15,
        icon: 'FaCheckCircle',
        color: 'cd-text-indigo-500',
        displayOrder: 6
      },
      {
        actionType: 'invite_friend',
        title: 'Invitar un amigo',
        description: 'Gana puntos por invitar a un amigo a unirse a la plataforma',
        points: 15,
        icon: 'FaUserPlus',
        color: 'cd-text-pink-500',
        displayOrder: 7
      },
      {
        actionType: 'weekly_streak',
        title: 'Racha semanal',
        description: 'Gana puntos por mantener una racha de actividad durante una semana',
        points: 50,
        icon: 'FaFire',
        color: 'cd-text-red-500',
        displayOrder: 8
      }
    ];

    console.log('Iniciando seeder de reglas de recompensas...');
    
    // Insertar o actualizar las reglas
    for (const ruleData of rewardRulesData) {
      const [rule, created] = await RewardRule.findOrCreate({
        where: { actionType: ruleData.actionType },
        defaults: ruleData
      });

      if (created) {
        console.log(`✓ Creada nueva regla: ${ruleData.title} (${ruleData.actionType})`);
      } else {
        console.log(`→ Actualizando regla existente: ${ruleData.title} (${ruleData.actionType})`);
        // Actualizar la regla existente pero mantener los puntos actuales
        await rule.update({
          title: ruleData.title,
          description: ruleData.description,
          iconName: ruleData.iconName,
          colorClass: ruleData.colorClass,
          displayOrder: ruleData.displayOrder,
          // No actualizamos points para mantener configuraciones personalizadas
        });
        console.log(`✅ Regla actualizada: ${ruleData.title}`);
      }
    }

    console.log('🎉 Reglas de recompensas inicializadas exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error al inicializar reglas de recompensas:', error);
    return false;
  }
};

module.exports = {
  initializeRewardRules
};

// Ejecutar automáticamente si se ejecuta directamente
if (require.main === module) {
  initializeRewardRules()
    .then(() => {
      console.log('✅ Seeder ejecutado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error ejecutando seeder:', error);
      process.exit(1);
    });
}
