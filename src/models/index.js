const User = require('./User');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
const Challenge = require('./Challenge');
const Participant = require('./Participant');
const Comment = require('./Comment');
const Category = require('./Category');
const evidenceModel = require('./evidence');
const timelineEventModel = require('./TimelineEvent');
const notificationModel = require('./Notification');
const UserPoints = require('./UserPoints');
const { Badge, UserBadge } = require('./Badge');
const RewardRule = require('./RewardRule');
const PointHistory = require('./PointHistory');
const Rule = require('./Rule');
const RuleCompliance = require('./RuleCompliance');
const evidenceRuleComplianceModel = require('./EvidenceRuleCompliance');
// Modelos para sistema de eliminación de cuenta
const UserAuditTrail = require('./UserAuditTrail');
const UserLegalHold = require('./UserLegalHold');
const UserExitSurvey = require('./UserExitSurvey');
const AccountRecoveryRequest = require('./AccountRecoveryRequest');
const { sequelize } = require('../config/database');

// Importar modelos de MongoDB para funcionalidades sociales
const mongoModels = require('./mongodb');

// Inicializar los modelos que se exportan como funciones
const Evidence = evidenceModel(sequelize);
const TimelineEvent = timelineEventModel(sequelize);
const Notification = notificationModel(sequelize);
const EvidenceRuleCompliance = evidenceRuleComplianceModel(sequelize);

// Definir todas las relaciones entre modelos

// Relaciones User-Wallet
User.hasOne(Wallet, { foreignKey: 'userId', as: 'wallet' });
Wallet.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Relaciones Wallet-Transaction
Wallet.hasMany(Transaction, { foreignKey: 'walletId', as: 'transactions' });
Transaction.belongsTo(Wallet, { foreignKey: 'walletId', as: 'wallet' });

// Relaciones para transferencias entre wallets
Transaction.belongsTo(Wallet, { foreignKey: 'destinationWalletId', as: 'destinationWallet' });

// Relaciones User-Challenge (creador)
User.hasMany(Challenge, { foreignKey: 'creatorId', as: 'createdChallenges' });
Challenge.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });

// Relaciones User-Challenge (retador)
User.hasMany(Challenge, { foreignKey: 'challengerId', as: 'challengedChallenges' });
Challenge.belongsTo(User, { foreignKey: 'challengerId', as: 'challengerUser' });

// Relaciones User-Challenge (juez)
User.hasMany(Challenge, { foreignKey: 'judgeId', as: 'judgedChallenges' });
Challenge.belongsTo(User, { foreignKey: 'judgeId', as: 'judgeUser' });

// Relaciones User-Participant-Challenge (participantes)
User.hasMany(Participant, { foreignKey: 'userId', as: 'participations' });
Challenge.hasMany(Participant, { foreignKey: 'challengeId', as: 'participants' });
Participant.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Participant.belongsTo(Challenge, { foreignKey: 'challengeId', as: 'challenge' });

// Relaciones para comentarios
User.hasMany(Comment, { foreignKey: 'userId', as: 'comments' });
Challenge.hasMany(Comment, { foreignKey: 'challengeId', as: 'comments' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Comment.belongsTo(Challenge, { foreignKey: 'challengeId', as: 'challenge' });

// Relaciones para respuestas a comentarios
Comment.belongsTo(Comment, { foreignKey: 'parentId', as: 'parent' });
Comment.hasMany(Comment, { foreignKey: 'parentId', as: 'replies' });

// Relaciones Challenge-Category
Category.hasMany(Challenge, { foreignKey: 'categoryId', as: 'challenges' });
Challenge.belongsTo(Category, { foreignKey: 'categoryId', as: 'categoryInfo' });

// Relaciones para evidencias
Challenge.hasMany(Evidence, { foreignKey: 'challengeId', as: 'evidences' });
User.hasMany(Evidence, { foreignKey: 'userId', as: 'evidences' });
Evidence.belongsTo(Challenge, { foreignKey: 'challengeId', as: 'challenge' });
Evidence.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Relaciones para eventos de la línea de tiempo
Challenge.hasMany(TimelineEvent, { foreignKey: 'challengeId', as: 'timelineEvents' });
TimelineEvent.belongsTo(Challenge, { foreignKey: 'challengeId', as: 'challenge' });
User.hasMany(TimelineEvent, { foreignKey: 'userId', as: 'timelineEvents' });
TimelineEvent.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Relaciones para notificaciones
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Relaciones para gamificación
// UserPoints - User
User.hasOne(UserPoints, { foreignKey: 'userId', as: 'userPoints' });
UserPoints.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Badge - UserBadge - User
Badge.hasMany(UserBadge, { foreignKey: 'badgeId', as: 'userBadges' });
UserBadge.belongsTo(Badge, { foreignKey: 'badgeId', as: 'Badge' });
User.hasMany(UserBadge, { foreignKey: 'userId', as: 'userBadges' });
UserBadge.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Relaciones para Rules - HABILITADAS CON CUIDADO
try {
  Challenge.hasMany(Rule, { foreignKey: 'challengeId', as: 'challengeRules' });
  Rule.belongsTo(Challenge, { foreignKey: 'challengeId', as: 'challenge' });
  console.log('✅ Asociaciones de Rule configuradas');
} catch (error) {
  console.error('❌ Error configurando asociaciones de Rule:', error);
}

// Relaciones para RuleCompliance - HABILITADAS CON CUIDADO
try {
  Rule.hasMany(RuleCompliance, { foreignKey: 'ruleId', as: 'compliances' });
  RuleCompliance.belongsTo(Rule, { foreignKey: 'ruleId', as: 'rule' });
  
  Participant.hasMany(RuleCompliance, { foreignKey: 'participantId', as: 'ruleCompliances' });
  RuleCompliance.belongsTo(Participant, { foreignKey: 'participantId', as: 'participant' });
  
  User.hasMany(RuleCompliance, { foreignKey: 'judgeId', as: 'judgedRuleCompliances' });
  RuleCompliance.belongsTo(User, { foreignKey: 'judgeId', as: 'judge' });
  console.log('✅ Asociaciones de RuleCompliance configuradas');
} catch (error) {
  console.error('❌ Error configurando asociaciones de RuleCompliance:', error);
}

// Relaciones para EvidenceRuleCompliance - NUEVA FUNCIONALIDAD
try {
  // Evidence - EvidenceRuleCompliance
  Evidence.hasMany(EvidenceRuleCompliance, { foreignKey: 'evidenceId', as: 'ruleCompliances' });
  EvidenceRuleCompliance.belongsTo(Evidence, { foreignKey: 'evidenceId', as: 'evidence' });
  
  // Rule - EvidenceRuleCompliance
  Rule.hasMany(EvidenceRuleCompliance, { foreignKey: 'ruleId', as: 'evidenceCompliances' });
  EvidenceRuleCompliance.belongsTo(Rule, { foreignKey: 'ruleId', as: 'rule' });
  
  // Participant - EvidenceRuleCompliance
  Participant.hasMany(EvidenceRuleCompliance, { foreignKey: 'participantId', as: 'evidenceRuleCompliances' });
  EvidenceRuleCompliance.belongsTo(Participant, { foreignKey: 'participantId', as: 'participant' });
  
  // User - EvidenceRuleCompliance
  User.hasMany(EvidenceRuleCompliance, { foreignKey: 'userId', as: 'evidenceRuleCompliances' });
  EvidenceRuleCompliance.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  
  // Challenge - EvidenceRuleCompliance
  Challenge.hasMany(EvidenceRuleCompliance, { foreignKey: 'challengeId', as: 'evidenceRuleCompliances' });
  EvidenceRuleCompliance.belongsTo(Challenge, { foreignKey: 'challengeId', as: 'challenge' });
  
  console.log('✅ Asociaciones de EvidenceRuleCompliance configuradas');
} catch (error) {
  console.error('❌ Error configurando asociaciones de EvidenceRuleCompliance:', error);
}

// Relación Challenge-User (ganador)
User.hasMany(Challenge, { foreignKey: 'winnerId', as: 'wonChallenges' });
Challenge.belongsTo(User, { foreignKey: 'winnerId', as: 'winner' });

// =====================================================
// ASOCIACIONES PARA SISTEMA DE ELIMINACIÓN DE CUENTA
// =====================================================

// Relaciones User-UserLegalHold
User.hasMany(UserLegalHold, { foreignKey: 'userId', as: 'legalHolds' });
UserLegalHold.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Relaciones User-UserExitSurvey
User.hasMany(UserExitSurvey, { foreignKey: 'userId', as: 'exitSurveys' });
UserExitSurvey.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Relaciones User-AccountRecoveryRequest
User.hasMany(AccountRecoveryRequest, { foreignKey: 'userId', as: 'recoveryRequests' });
AccountRecoveryRequest.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Relación AccountRecoveryRequest-User (reviewer)
User.hasMany(AccountRecoveryRequest, { foreignKey: 'reviewedBy', as: 'reviewedRecoveryRequests' });
AccountRecoveryRequest.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' });

console.log('✅ Asociaciones del sistema de eliminación configuradas');

module.exports = {
  // Modelos PostgreSQL
  User,
  Wallet,
  Transaction,
  Challenge,
  Participant,
  Comment,
  Category,
  Evidence,
  TimelineEvent,
  Notification,
  UserPoints,
  Badge,
  UserBadge,
  RewardRule,
  PointHistory,
  Rule,
  RuleCompliance,
  EvidenceRuleCompliance,
  
  // Modelos de eliminación de cuenta
  UserAuditTrail,
  UserLegalHold,
  UserExitSurvey,
  AccountRecoveryRequest,
  
  sequelize,
  
  // Modelos MongoDB
  mongoModels
};
