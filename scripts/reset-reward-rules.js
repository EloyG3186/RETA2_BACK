const { sequelize } = require('../src/config/database');

async function resetRewardRules() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida');

    console.log('🗑️ Eliminando tabla reward_rules si existe...');
    await sequelize.query('DROP TABLE IF EXISTS reward_rules CASCADE;');
    console.log('✅ Tabla eliminada exitosamente');

    console.log('🔄 Creando tabla reward_rules...');
    await sequelize.query(`
      CREATE TABLE reward_rules (
        id SERIAL PRIMARY KEY,
        action_type VARCHAR(255) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        points INTEGER NOT NULL DEFAULT 0,
        icon_name VARCHAR(255) NOT NULL DEFAULT 'FaTrophy',
        color_class VARCHAR(255) NOT NULL DEFAULT 'cd-text-blue-500',
        is_active BOOLEAN NOT NULL DEFAULT true,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(' Tabla reward_rules creada exitosamente');

    console.log(' Insertando datos iniciales...');
    await sequelize.query(`
      INSERT INTO reward_rules (action_type, title, description, points, icon_name, color_class, display_order) VALUES
      ('create_challenge', 'Crear desafío', 'Crea un nuevo desafío para la comunidad', 10, 'FaPlus', 'cd-text-green-500', 1),
      ('accept_challenge', 'Aceptar desafío', 'Acepta un desafío de un amigo', 5, 'FaHandshake', 'cd-text-blue-500', 2),
      ('complete_challenge', 'Completar desafío', 'Completa un desafío exitosamente', 20, 'FaCheckCircle', 'cd-text-purple-500', 3),
      ('win_challenge', 'Ganar desafío', 'Gana un desafío competitivo', 30, 'FaTrophy', 'cd-text-yellow-500', 4),
      ('judge_challenge', 'Ser juez', 'Actúa como juez en un desafío', 25, 'FaGavel', 'cd-text-indigo-500', 5),
      ('complete_judge_task', 'Completar tarea de juez', 'Completa una tarea como juez', 15, 'FaCheck', 'cd-text-teal-500', 6),
      ('invite_friend', 'Invitar amigo', 'Invita a un amigo a la plataforma', 15, 'FaUserPlus', 'cd-text-pink-500', 7),
      ('weekly_streak', 'Racha semanal', 'Mantén una racha de actividad semanal', 50, 'FaFire', 'cd-text-red-500', 8);
    `);
    console.log(' Datos iniciales insertados');

    await sequelize.close();
    console.log(' Reset de reward_rules completado exitosamente');
  } catch (error) {
    console.error(' Error al resetear reward_rules:', error);
    console.error('❌ Error al resetear reward_rules:', error);
    process.exit(1);
  }
}

resetRewardRules();
