const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const Notification = (sequelize) => {
  return sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM(
        'challenge_judge_needed',
        'challenge_invitation', 
        'judge_invitation',
        'evidence_submitted',
        'challenge_completed',
        'challenge_received',
        'challenge_joined',
        'challenge_accepted',
        'judge_review_requested',
        'judge_assigned',
        'judge_verdict',
        'challenge_cancelled'
      ),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    relatedId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID relacionado con la notificación (ej: challengeId)'
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'notifications',
    underscored: true,
    timestamps: true
  });
};

module.exports = Notification;
