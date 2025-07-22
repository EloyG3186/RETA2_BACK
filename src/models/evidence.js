const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Evidence = sequelize.define('Evidence', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    fileUrl: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileType: {
      type: DataTypes.STRING, // 'image', 'video', 'document'
      allowNull: false
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    }
  }, {
    timestamps: true
  });

  Evidence.associate = (models) => {
    // Una evidencia pertenece a un desafío
    Evidence.belongsTo(models.Challenge, {
      foreignKey: 'challengeId',
      onDelete: 'CASCADE'
    });

    // Una evidencia pertenece a un usuario
    Evidence.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'submitter'
    });
  };

  return Evidence;
};
