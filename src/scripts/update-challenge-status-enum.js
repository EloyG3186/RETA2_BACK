const { sequelize } = require('../config/database');

async function updateChallengeStatusEnum() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Iniciando actualización del tipo ENUM para el estado de desafíos...');
    
    // 0. Verificar si hay valores 'active' y actualizarlos a 'in_progress'
    await sequelize.query(`
      UPDATE "challenges" 
      SET "status" = 'in_progress' 
      WHERE "status" = 'active';
    `, { transaction });
    
    console.log('Valores "active" actualizados a "in_progress" si existen');
    
    // 1. Eliminar el valor por defecto de la columna status
    await sequelize.query(`
      ALTER TABLE "challenges" 
      ALTER COLUMN "status" DROP DEFAULT;
    `, { transaction });
    
    console.log('Valor por defecto de la columna status eliminado con éxito');
    
    // 2. Crear un tipo temporal con los nuevos valores
    await sequelize.query(`
      CREATE TYPE "enum_challenges_status_new" AS ENUM(
        'pending', 
        'accepted', 
        'judge_assigned', 
        'in_progress', 
        'judging', 
        'completed', 
        'cancelled'
      );
    `, { transaction });
    
    console.log('Tipo ENUM temporal creado con éxito');
    
    // 3. Actualizar la columna para usar el nuevo tipo con CASE para manejar valores no esperados
    await sequelize.query(`
      ALTER TABLE "challenges" 
      ALTER COLUMN "status" TYPE "enum_challenges_status_new" 
      USING (
        CASE "status"
          WHEN 'pending' THEN 'pending'::"enum_challenges_status_new"
          WHEN 'accepted' THEN 'accepted'::"enum_challenges_status_new"
          WHEN 'in_progress' THEN 'in_progress'::"enum_challenges_status_new"
          WHEN 'judging' THEN 'judging'::"enum_challenges_status_new"
          WHEN 'completed' THEN 'completed'::"enum_challenges_status_new"
          WHEN 'cancelled' THEN 'cancelled'::"enum_challenges_status_new"
          ELSE 'pending'::"enum_challenges_status_new"
        END
      );
    `, { transaction });
    
    console.log('Columna status actualizada con éxito');
    
    // 4. Eliminar el tipo antiguo
    await sequelize.query(`
      DROP TYPE "enum_challenges_status";
    `, { transaction });
    
    console.log('Tipo ENUM antiguo eliminado con éxito');
    
    // 5. Renombrar el nuevo tipo para que tenga el nombre original
    await sequelize.query(`
      ALTER TYPE "enum_challenges_status_new" RENAME TO "enum_challenges_status";
    `, { transaction });
    
    console.log('Tipo ENUM renombrado con éxito');
    
    // 6. Restaurar el valor por defecto de la columna status
    await sequelize.query(`
      ALTER TABLE "challenges" 
      ALTER COLUMN "status" SET DEFAULT 'pending'::"enum_challenges_status";
    `, { transaction });
    
    console.log('Valor por defecto de la columna status restaurado con éxito');
    
    // Confirmar los cambios
    await transaction.commit();
    console.log('Actualización completada con éxito');
    
  } catch (error) {
    // Revertir los cambios en caso de error
    await transaction.rollback();
    console.error('Error al actualizar el tipo ENUM:', error);
    throw error;
  } finally {
    // Cerrar la conexión
    await sequelize.close();
  }
}

// Ejecutar la función
updateChallengeStatusEnum()
  .then(() => {
    console.log('Script finalizado con éxito');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error en el script:', error);
    process.exit(1);
  });
