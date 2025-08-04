'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('rule_compliance', 'auto_evaluated', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'True if this evaluation was done automatically by the system'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('rule_compliance', 'auto_evaluated');
  }
};
