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
const { sequelize } = require('../config/database');

// Importar modelos de MongoDB para funcionalidades sociales
const mongoModels = require('./mongodb');

// Inicializar los modelos que se exportan como funciones
const Evidence = evidenceModel(sequelize);
const TimelineEvent = timelineEventModel(sequelize);
const Notification = notificationModel(sequelize);

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
  sequelize,
  
  // Modelos MongoDB
  mongoModels
};
