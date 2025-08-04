const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserExitSurvey = sequelize.define('UserExitSurvey', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true, // Puede ser null si el usuario ya fue eliminado
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  primaryReason: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'primary_reason',
    validate: {
      isIn: [[
        'no_uso_frecuente',
        'alternativa_mejor',
        'problemas_tecnicos',
        'falta_funcionalidades',
        'preocupaciones_privacidad',
        'demasiadas_notificaciones',
        'interfaz_confusa',
        'problemas_usuarios',
        'motivos_economicos',
        'cambio_intereses',
        'otro'
      ]]
    }
  },
  detailedReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'detailed_reason',
    validate: {
      len: [0, 1000] // Máximo 1000 caracteres
    }
  },
  satisfactionRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'satisfaction_rating',
    validate: {
      min: 1,
      max: 5
    }
  },
  featuresUsed: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'features_used',
    comment: 'Array de funcionalidades utilizadas'
  },
  suggestions: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 1000] // Máximo 1000 caracteres
    }
  },
  wouldRecommend: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    field: 'would_recommend'
  },
  returnLikelihood: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'return_likelihood',
    validate: {
      min: 1,
      max: 10
    }
  },
  platformRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'platform_rating',
    validate: {
      min: 1,
      max: 5
    }
  }
}, {
  timestamps: true,
  updatedAt: false, // Solo createdAt, no updatedAt
  tableName: 'user_exit_surveys',
  underscored: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['primary_reason']
    },
    {
      fields: ['satisfaction_rating']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Métodos de instancia
UserExitSurvey.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  
  // Agregar etiquetas legibles para las razones
  const reasonLabels = {
    'no_uso_frecuente': 'No uso la plataforma frecuentemente',
    'alternativa_mejor': 'Encontré una alternativa mejor',
    'problemas_tecnicos': 'Problemas técnicos recurrentes',
    'falta_funcionalidades': 'Falta de funcionalidades importantes',
    'preocupaciones_privacidad': 'Preocupaciones de privacidad',
    'demasiadas_notificaciones': 'Demasiadas notificaciones',
    'interfaz_confusa': 'Interfaz confusa o difícil de usar',
    'problemas_usuarios': 'Problemas con otros usuarios',
    'motivos_economicos': 'Motivos económicos',
    'cambio_intereses': 'Cambio de intereses personales',
    'otro': 'Otro motivo'
  };
  
  values.primaryReasonLabel = reasonLabels[values.primaryReason] || values.primaryReason;
  
  return values;
};

// Métodos estáticos
UserExitSurvey.getReasonOptions = function() {
  return [
    { value: 'no_uso_frecuente', label: 'No uso la plataforma frecuentemente' },
    { value: 'alternativa_mejor', label: 'Encontré una alternativa mejor' },
    { value: 'problemas_tecnicos', label: 'Problemas técnicos recurrentes' },
    { value: 'falta_funcionalidades', label: 'Falta de funcionalidades importantes' },
    { value: 'preocupaciones_privacidad', label: 'Preocupaciones de privacidad' },
    { value: 'demasiadas_notificaciones', label: 'Demasiadas notificaciones' },
    { value: 'interfaz_confusa', label: 'Interfaz confusa o difícil de usar' },
    { value: 'problemas_usuarios', label: 'Problemas con otros usuarios' },
    { value: 'motivos_economicos', label: 'Motivos económicos' },
    { value: 'cambio_intereses', label: 'Cambio de intereses personales' },
    { value: 'otro', label: 'Otro motivo' }
  ];
};

UserExitSurvey.getAnalytics = async function(startDate, endDate) {
  const { Op, fn, col } = require('sequelize');
  
  const whereClause = {};
  if (startDate && endDate) {
    whereClause.createdAt = {
      [Op.between]: [startDate, endDate]
    };
  }
  
  // Estadísticas generales
  const generalStats = await this.findOne({
    where: whereClause,
    attributes: [
      [fn('COUNT', col('id')), 'totalSurveys'],
      [fn('AVG', col('satisfaction_rating')), 'avgSatisfaction'],
      [fn('AVG', col('return_likelihood')), 'avgReturnLikelihood'],
      [fn('AVG', col('platform_rating')), 'avgPlatformRating'],
      [fn('COUNT', fn('CASE', fn('WHEN', col('would_recommend'), true), 1)), 'wouldRecommendCount']
    ],
    raw: true
  });
  
  // Razones principales
  const reasonStats = await this.findAll({
    where: whereClause,
    attributes: [
      'primary_reason',
      [fn('COUNT', col('primary_reason')), 'count']
    ],
    group: ['primary_reason'],
    order: [[fn('COUNT', col('primary_reason')), 'DESC']],
    raw: true
  });
  
  // Funcionalidades más usadas
  const featuresStats = await this.findAll({
    where: {
      ...whereClause,
      featuresUsed: { [Op.ne]: null }
    },
    attributes: ['features_used'],
    raw: true
  });
  
  // Procesar funcionalidades
  const featureCount = {};
  featuresStats.forEach(survey => {
    if (survey.features_used && Array.isArray(survey.features_used)) {
      survey.features_used.forEach(feature => {
        featureCount[feature] = (featureCount[feature] || 0) + 1;
      });
    }
  });
  
  const topFeatures = Object.entries(featureCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([feature, count]) => ({ feature, count }));
  
  return {
    general: {
      totalSurveys: parseInt(generalStats.totalSurveys) || 0,
      avgSatisfaction: parseFloat(generalStats.avgSatisfaction) || 0,
      avgReturnLikelihood: parseFloat(generalStats.avgReturnLikelihood) || 0,
      avgPlatformRating: parseFloat(generalStats.avgPlatformRating) || 0,
      recommendationRate: generalStats.totalSurveys > 0 
        ? (parseInt(generalStats.wouldRecommendCount) / parseInt(generalStats.totalSurveys)) * 100 
        : 0
    },
    reasons: reasonStats.map(reason => ({
      reason: reason.primary_reason,
      count: parseInt(reason.count),
      percentage: generalStats.totalSurveys > 0 
        ? (parseInt(reason.count) / parseInt(generalStats.totalSurveys)) * 100 
        : 0
    })),
    topFeatures
  };
};

UserExitSurvey.createSurvey = async function(surveyData) {
  // Validaciones
  if (!surveyData.primaryReason) {
    throw new Error('La razón principal es requerida');
  }
  
  // Validar funcionalidades
  if (surveyData.featuresUsed && !Array.isArray(surveyData.featuresUsed)) {
    throw new Error('featuresUsed debe ser un array');
  }
  
  return await this.create({
    userId: surveyData.userId,
    primaryReason: surveyData.primaryReason,
    detailedReason: surveyData.detailedReason,
    satisfactionRating: surveyData.satisfactionRating,
    featuresUsed: surveyData.featuresUsed,
    suggestions: surveyData.suggestions,
    wouldRecommend: surveyData.wouldRecommend,
    returnLikelihood: surveyData.returnLikelihood,
    platformRating: surveyData.platformRating
  });
};

UserExitSurvey.getRecentSurveys = async function(limit = 10) {
  return await this.findAll({
    limit,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: sequelize.models.User,
        as: 'user',
        attributes: ['username'],
        required: false // LEFT JOIN para incluir surveys sin usuario
      }
    ]
  });
};

module.exports = UserExitSurvey;
