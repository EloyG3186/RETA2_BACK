// =====================================
// ENDPOINTS DEL SISTEMA DE REGLAS
// =====================================

// Obtener reglas de un desafío
const getChallengeRules = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 [getChallengeRules] Obteniendo reglas del desafío ${id}`);

    // Importar el modelo Rule
    const Rule = require('../models/Rule');
    
    const rules = await Rule.findAll({
      where: { challengeId: id },
      order: [['orderIndex', 'ASC']]
    });

    console.log(`✅ [getChallengeRules] ${rules.length} reglas encontradas`);
    
    res.json({
      success: true,
      message: 'Reglas obtenidas exitosamente',
      data: rules
    });
  } catch (error) {
    console.error('❌ [getChallengeRules] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las reglas del desafío',
      error: error.message
    });
  }
};

// Iniciar proceso de evaluación (cambiar estado a 'judging')
const startJudging = async (req, res) => {
  const { sequelize } = require('../config/database');
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    console.log(`📋 [startJudging] Iniciando evaluación del desafío ${id}`);

    // Importar modelos necesarios
    const Challenge = require('../models/Challenge');
    const User = require('../models/User');
    const TimelineEvent = require('../models/TimelineEvent');

    // Buscar el desafío
    const challenge = await Challenge.findByPk(id, { transaction });
    if (!challenge) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Desafío no encontrado'
      });
    }

    // Verificar que el usuario es el juez del desafío
    if (challenge.judgeId !== userId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Solo el juez asignado puede iniciar la evaluación'
      });
    }

    // Verificar que el desafío está en estado 'closed'
    if (challenge.status !== 'closed') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Solo se puede iniciar la evaluación de desafíos cerrados'
      });
    }

    // Actualizar el estado del desafío a 'judging'
    await challenge.update({
      status: 'judging',
      judgingStartedAt: new Date()
    }, { transaction });

    // Crear evento de timeline
    const judge = await User.findByPk(userId, {
      attributes: ['fullName', 'username']
    });
    
    await TimelineEvent.create({
      challengeId: id,
      type: 'judging_started',
      description: `El juez ${judge?.fullName || judge?.username || 'Juez'} inició la evaluación del desafío.`,
      timestamp: new Date()
    }, { transaction });

    await transaction.commit();
    
    console.log(`✅ [startJudging] Evaluación iniciada exitosamente para desafío ${id}`);
    
    res.json({
      success: true,
      message: 'Evaluación iniciada exitosamente',
      data: {
        id: challenge.id,
        status: 'judging',
        judgingStartedAt: challenge.judgingStartedAt
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ [startJudging] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar la evaluación',
      error: error.message
    });
  }
};

// Evaluar cumplimiento de una regla específica
const evaluateRule = async (req, res) => {
  const { sequelize } = require('../config/database');
  const transaction = await sequelize.transaction();
  
  try {
    const { id: challengeId, ruleId } = req.params;
    const { participantId, isCompliant, judgeComments } = req.body;
    const judgeId = req.user.id;
    
    console.log(`📋 [evaluateRule] Evaluando regla ${ruleId} para participante ${participantId}`);

    // Importar modelos necesarios
    const Rule = require('../models/Rule');
    const RuleCompliance = require('../models/RuleCompliance');
    const Challenge = require('../models/Challenge');
    
    // Verificar que la regla existe y pertenece al desafío
    const rule = await Rule.findOne({
      where: { id: ruleId, challengeId },
      transaction
    });
    
    if (!rule) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Regla no encontrada'
      });
    }

    // Verificar que el desafío está en estado 'judging'
    const challenge = await Challenge.findByPk(challengeId, { transaction });
    if (!challenge || challenge.status !== 'judging') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden evaluar reglas durante la fase de evaluación'
      });
    }

    // Verificar que el usuario es el juez
    if (challenge.judgeId !== judgeId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Solo el juez asignado puede evaluar reglas'
      });
    }

    // Crear o actualizar la evaluación de cumplimiento
    const [compliance, created] = await RuleCompliance.findOrCreate({
      where: {
        ruleId,
        participantId
      },
      defaults: {
        judgeId,
        isCompliant,
        judgeComments,
        evaluatedAt: new Date()
      },
      transaction
    });

    if (!created) {
      await compliance.update({
        judgeId,
        isCompliant,
        judgeComments,
        evaluatedAt: new Date()
      }, { transaction });
    }

    await transaction.commit();
    
    console.log(`✅ [evaluateRule] Regla evaluada exitosamente`);
    
    res.json({
      success: true,
      message: 'Regla evaluada exitosamente',
      data: {
        ruleId,
        participantId,
        isCompliant,
        judgeComments,
        evaluatedAt: compliance.evaluatedAt
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ [evaluateRule] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al evaluar la regla',
      error: error.message
    });
  }
};

// =====================================
// EXPORTS
// =====================================

module.exports = {
  // Nuevos endpoints del sistema de reglas
  getChallengeRules,
  startJudging,
  evaluateRule
};
