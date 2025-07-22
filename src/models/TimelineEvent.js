const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TimelineEvent = sequelize.define('TimelineEvent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    challengeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'challenges',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM(
        'challenge_created',
        'challenge_accepted',
        'challenge_started',
        'evidence_submitted',
        'evidence_approved',
        'evidence_rejected',
        'challenge_completed',
        'challenge_disputed',
        'judge_assigned',
        'judge_verdict',
        'challenge_cancelled'
      ),
      allowNull: false
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    tableName: 'timeline_events',
    timestamps: true
  });

  TimelineEvent.associate = (models) => {
    TimelineEvent.belongsTo(models.Challenge, {
      foreignKey: 'challengeId',
      as: 'challenge'
    });
  };

  return TimelineEvent;
};
