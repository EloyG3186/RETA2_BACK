'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verificar si la tabla ya existe
    const tableExists = await queryInterface.showAllTables()
      .then(tables => tables.includes('reward_rules'));
    
    if (!tableExists) {
      console.log('La tabla reward_rules no existe. Creándola...');
      
      // Crear la tabla con la restricción UNIQUE
      await queryInterface.createTable('reward_rules', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        actionType: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
          field: 'action_type',
          comment: 'Tipo de acción que activa la recompensa (create_challenge, win_challenge, etc.)'
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false,
          comment: 'Título descriptivo de la recompensa'
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: false,
          comment: 'Descripción detallada de cómo ganar estos puntos'
        },
        points: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Cantidad de puntos que otorga esta acción'
        },
        iconName: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'FaTrophy',
          field: 'icon_name',
          comment: 'Nombre del ícono de React Icons (FaTrophy, FaCheck, etc.)'
        },
        colorClass: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'cd-text-blue-500',
          field: 'color_class',
          comment: 'Clase CSS para el color del ícono'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          field: 'is_active',
          comment: 'Indica si la regla está activa'
        },
        displayOrder: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'display_order',
          comment: 'Orden de visualización en la interfaz'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          field: 'created_at',
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          field: 'updated_at',
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
      
      console.log('✅ Tabla reward_rules creada exitosamente');
    } else {
      console.log('La tabla reward_rules ya existe. Verificando restricciones...');
      
      // Verificar si la restricción UNIQUE ya existe
      const [results] = await queryInterface.sequelize.query(
        `SELECT conname FROM pg_constraint WHERE conname = 'reward_rules_action_type_key'`
      );
      
      // Si la restricción no existe, la creamos
      if (results.length === 0) {
        console.log('Añadiendo restricción UNIQUE a la columna action_type...');
        await queryInterface.addConstraint('reward_rules', {
          fields: ['action_type'],
          type: 'unique',
          name: 'reward_rules_action_type_key'
        });
        console.log('✅ Restricción UNIQUE añadida exitosamente');
      } else {
        console.log('ℹ️ La restricción UNIQUE ya existe');
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Eliminar la tabla (solo para desarrollo)
    if (process.env.NODE_ENV !== 'production') {
      await queryInterface.dropTable('reward_rules');
      console.log('Tabla reward_rules eliminada');
    } else {
      console.log('No se puede eliminar la tabla en producción');
    }
  }
};
