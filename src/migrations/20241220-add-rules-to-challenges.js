'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Agregar columna 'rules' a la tabla 'challenges'
    await queryInterface.addColumn('challenges', 'rules', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON string containing challenge rules'
    });
    
    console.log('✅ Columna "rules" agregada exitosamente a la tabla "challenges"');
  },

  async down(queryInterface, Sequelize) {
    // Eliminar columna 'rules' de la tabla 'challenges'
    await queryInterface.removeColumn('challenges', 'rules');
    
    console.log('✅ Columna "rules" eliminada exitosamente de la tabla "challenges"');
  }
};
