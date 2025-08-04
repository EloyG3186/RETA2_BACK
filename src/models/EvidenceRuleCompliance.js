const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EvidenceRuleCompliance = sequelize.define('EvidenceRuleCompliance', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    evidenceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'evidence_id',
      references: {
        model: 'evidences',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    ruleId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'rule_id',
      references: {
        model: 'rules',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    participantId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'participant_id',
      references: {
        model: 'participants',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    challengeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'challenge_id',
      references: {
        model: 'challenges',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    claimedCompliance: {
      type: DataTypes.BOOLEAN,
      field: 'claimed_compliance',
      defaultValue: true,
      allowNull: false,
      comment: 'User claims this evidence fulfills this rule'
    }
  }, {
    tableName: 'evidence_rule_compliance',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['evidence_id', 'rule_id', 'participant_id'],
        name: 'unique_evidence_rule_participant'
      },
      {
        fields: ['challenge_id'],
        name: 'idx_evidence_rule_compliance_challenge'
      },
      {
        fields: ['user_id'],
        name: 'idx_evidence_rule_compliance_user'
      },
      {
        fields: ['rule_id'],
        name: 'idx_evidence_rule_compliance_rule'
      },
      {
        fields: ['participant_id'],
        name: 'idx_evidence_rule_compliance_participant'
      }
    ]
  });

  EvidenceRuleCompliance.associate = (models) => {
    // Relación con Evidence
    EvidenceRuleCompliance.belongsTo(models.Evidence, {
      foreignKey: 'evidenceId',
      as: 'evidence'
    });

    // Relación con Rule
    EvidenceRuleCompliance.belongsTo(models.Rule, {
      foreignKey: 'ruleId',
      as: 'rule'
    });

    // Relación con Participant
    EvidenceRuleCompliance.belongsTo(models.Participant, {
      foreignKey: 'participantId',
      as: 'participant'
    });

    // Relación con User
    EvidenceRuleCompliance.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // Relación con Challenge
    EvidenceRuleCompliance.belongsTo(models.Challenge, {
      foreignKey: 'challengeId',
      as: 'challenge'
    });
  };

  return EvidenceRuleCompliance;
};
