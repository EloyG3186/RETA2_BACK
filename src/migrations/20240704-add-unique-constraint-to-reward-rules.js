'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Primero verificar si la restricción ya existe
    const tableName = 'reward_rules';
    const columnName = 'action_type';
    const constraintName = 'reward_rules_action_type_key';
    
    try {
      // Verificar si la restricción ya existe
      const [results] = await queryInterface.sequelize.query(
        `SELECT conname FROM pg_constraint WHERE conname = '${constraintName}'`
      );
      
      // Si la restricción no existe, la creamos
      if (results.length === 0) {
        console.log(`Añadiendo restricción UNIQUE a la columna ${columnName}...`);
        await queryInterface.addConstraint(tableName, {
          fields: [columnName],
          type: 'unique',
          name: constraintName
        });
        console.log('✅ Restricción UNIQUE añadida exitosamente');
      } else {
        console.log('ℹ️ La restricción UNIQUE ya existe');
      }
    } catch (error) {
      console.error('❌ Error al añadir la restricción UNIQUE:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Eliminar la restricción si existe
    const tableName = 'reward_rules';
    const constraintName = 'reward_rules_action_type_key';
    
    try {
      console.log(`Eliminando restricción UNIQUE ${constraintName}...`);
      await queryInterface.removeConstraint(tableName, constraintName);
      console.log('✅ Restricción UNIQUE eliminada exitosamente');
    } catch (error) {
      console.error('❌ Error al eliminar la restricción UNIQUE:', error);
      throw error;
    }
  }
};
