'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Agregar el nuevo valor al enum existente
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_timeline_events_type" ADD VALUE 'challenge_closed';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // No se puede remover valores de un enum en PostgreSQL fácilmente
    // Se requeriría recrear el enum completo
    console.log('Rollback no implementado para enum values');
  }
};
