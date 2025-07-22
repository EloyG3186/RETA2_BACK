const { sequelize } = require('../config/database');
const { Challenge, Participant, User } = require('../models');

/**
 * Migración para agregar el campo challenger_id a la tabla challenges
 * y el campo role a la tabla participants
 */
async function runMigration() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Iniciando migración...');
    
    // 1. Verificar si las columnas ya existen
    const challengeTableInfo = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'challenges' AND column_name = 'challengerId'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    const participantTableInfo = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'participants' AND column_name = 'role'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    // 2. Agregar la columna challengerId si no existe
    if (challengeTableInfo.length === 0) {
      console.log('Agregando columna challengerId a la tabla challenges...');
      await sequelize.query(
        "ALTER TABLE challenges ADD COLUMN \"challengerId\" UUID REFERENCES users(id)",
        { transaction }
      );
    } else {
      console.log('La columna challengerId ya existe en la tabla challenges');
    }
    
    // 3. Agregar la columna role si no existe
    if (participantTableInfo.length === 0) {
      console.log('Agregando columna role a la tabla participants...');
      await sequelize.query(
        "ALTER TABLE participants ADD COLUMN role VARCHAR(20) CHECK (role IN ('creator', 'challenger', 'judge', 'observer'))",
        { transaction }
      );
    } else {
      console.log('La columna role ya existe en la tabla participants');
    }
    
    // 4. Actualizar los registros existentes
    console.log('Actualizando registros existentes...');
    
    // Obtener todos los desafíos
    const challenges = await Challenge.findAll({ transaction });
    
    for (const challenge of challenges) {
      // Obtener todos los participantes del desafío
      const participants = await Participant.findAll({
        where: { challengeId: challenge.id },
        transaction
      });
      
      // Identificar al creador
      const creatorParticipant = participants.find(p => p.userId === challenge.creatorId);
      if (creatorParticipant) {
        await creatorParticipant.update({ role: 'creator' }, { transaction });
      }
      
      // Identificar al retador (cualquier participante que no sea el creador)
      const challengerParticipant = participants.find(p => p.userId !== challenge.creatorId);
      if (challengerParticipant) {
        await challengerParticipant.update({ role: 'challenger' }, { transaction });
        
        // Actualizar el challengerId en la tabla challenges
        await challenge.update({ challengerId: challengerParticipant.userId }, { transaction });
      }
      
      // Identificar al juez
      if (challenge.judgeId) {
        const judgeParticipant = participants.find(p => p.userId === challenge.judgeId);
        if (judgeParticipant) {
          await judgeParticipant.update({ role: 'judge' }, { transaction });
        }
      }
    }
    
    await transaction.commit();
    console.log('Migración completada con éxito');
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error durante la migración:', error);
  }
}

// Ejecutar la migración
runMigration()
  .then(() => {
    console.log('Script de migración ejecutado correctamente');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error al ejecutar la migración:', err);
    process.exit(1);
  });
