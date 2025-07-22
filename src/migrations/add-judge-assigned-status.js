'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Crear un tipo temporal con los nuevos valores
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_challenges_status_new" AS ENUM(
        'pending', 
        'accepted', 
        'judge_assigned', 
        'in_progress', 
        'judging', 
        'completed', 
        'cancelled'
      );
    `);

    // Actualizar la columna para usar el nuevo tipo
    await queryInterface.sequelize.query(`
      ALTER TABLE "challenges" 
      ALTER COLUMN "status" TYPE "enum_challenges_status_new" 
      USING "status"::text::"enum_challenges_status_new";
    `);

    // Eliminar el tipo antiguo
    await queryInterface.sequelize.query(`
      DROP TYPE "enum_challenges_status";
    `);

    // Renombrar el nuevo tipo para que tenga el nombre original
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_challenges_status_new" RENAME TO "enum_challenges_status";
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Crear un tipo temporal con los valores originales
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_challenges_status_old" AS ENUM(
        'pending', 
        'accepted', 
        'in_progress', 
        'judging', 
        'completed', 
        'cancelled'
      );
    `);

    // Actualizar la columna para usar el tipo original
    // Nota: Esto podría causar pérdida de datos si hay registros con estado 'judge_assigned'
    await queryInterface.sequelize.query(`
      ALTER TABLE "challenges" 
      ALTER COLUMN "status" TYPE "enum_challenges_status_old" 
      USING (
        CASE 
          WHEN "status" = 'judge_assigned'::text::"enum_challenges_status" THEN 'accepted'::text::"enum_challenges_status_old"
          ELSE "status"::text::"enum_challenges_status_old" 
        END
      );
    `);

    // Eliminar el tipo nuevo
    await queryInterface.sequelize.query(`
      DROP TYPE "enum_challenges_status";
    `);

    // Renombrar el tipo original para que tenga el nombre correcto
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_challenges_status_old" RENAME TO "enum_challenges_status";
    `);
  }
};
