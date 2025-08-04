
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Challenge = sequelize.define('Challenge', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  creatorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  entryFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  prize: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  maxParticipants: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'judge_assigned', 'in_progress', 'closed', 'judging', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  isPrivate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  inviteCode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  judgeId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  challengerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  judgeVerdict: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  judgeDecisionDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  winnerDetermined: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  prizeFrozen: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  rules: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON string containing challenge rules'
  },
  winnerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  winnerReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Explanation of why this participant won'
  },
  closedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the judge closed the challenge'
  },
  judgingStartedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the judge started evaluating rules'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the winner was determined'
  }
}, {
  timestamps: true,
  tableName: 'challenges'
});

// Las relaciones se definen en el archivo index.js

module.exports = Challenge;
