const { Challenge, Rule, RuleCompliance, Participant, User } = require('../models');
const { sequelize } = require('../config/database');

class RuleEvaluationService {
  /**
   * Crear reglas para un desafío
   * @param {string} challengeId - ID del desafío
   * @param {Array} rulesArray - Array de descripciones de reglas
   * @param {Object} transaction - Transacción de base de datos (opcional)
   * @returns {Promise<Array>} - Reglas creadas
   */
  async createRulesForChallenge(challengeId, rulesArray, transaction = null) {
    try {
      console.log(`📋 [RuleEvaluation] === INICIANDO CREACIÓN DE REGLAS ===`);
      console.log(`📋 [RuleEvaluation] challengeId:`, challengeId);
      console.log(`📋 [RuleEvaluation] rulesArray:`, rulesArray);
      console.log(`📋 [RuleEvaluation] rulesArray tipo:`, typeof rulesArray);
      console.log(`📋 [RuleEvaluation] rulesArray es array:`, Array.isArray(rulesArray));
      console.log(`📋 [RuleEvaluation] rulesArray longitud:`, rulesArray?.length);
      console.log(`📋 [RuleEvaluation] transaction:`, !!transaction);
      
      if (!rulesArray || rulesArray.length === 0) {
        console.log(`⚠️ [RuleEvaluation] No hay reglas para crear`);
        return [];
      }

      // Preparar reglas para creación
      const rulesToCreate = rulesArray.map((ruleDescription, index) => ({
        challengeId,
        description: ruleDescription,
        orderIndex: index + 1,
        isMandatory: true // Por defecto todas son obligatorias
      }));
      
      console.log(`📋 [RuleEvaluation] rulesToCreate preparadas:`, rulesToCreate);

      // Crear reglas
      console.log(`📋 [RuleEvaluation] Llamando a Rule.bulkCreate...`);
      const createdRules = await Rule.bulkCreate(rulesToCreate, { transaction });
      
      console.log(`✅ [RuleEvaluation] ${createdRules.length} reglas creadas exitosamente`);
      console.log(`✅ [RuleEvaluation] Reglas creadas:`, createdRules.map(r => ({ id: r.id, description: r.description })));
      
      return createdRules;

    } catch (error) {
      console.error(`❌ [RuleEvaluation] Error creando reglas:`, error);
      throw error;
    }
  }

  /**
   * Obtener reglas pendientes de evaluación para un juez
   * @param {string} challengeId - ID del desafío
   * @param {string} judgeId - ID del juez
   * @returns {Promise<Object>} - Reglas con estado de evaluación
   */
  async getPendingRulesForJudge(challengeId, judgeId) {
    try {
      console.log(`🔍 [RuleEvaluation] Obteniendo reglas pendientes para juez ${judgeId} en desafío ${challengeId}`);
      
      // Verificar que el juez tiene permisos
      const challenge = await Challenge.findByPk(challengeId);
      if (!challenge) {
        throw new Error('Desafío no encontrado');
      }
      
      if (challenge.judgeId !== judgeId) {
        throw new Error('No tienes permisos para evaluar este desafío');
      }

      // Obtener reglas con sus evaluaciones
      const rules = await Rule.findAll({
        where: { challengeId },
        include: [{
          model: RuleCompliance,
          as: 'compliances',
          include: [
            {
              model: Participant,
              as: 'participant',
              include: [{ model: User, as: 'user' }]
            }
          ]
        }],
        order: [['orderIndex', 'ASC']]
      });

      // Formatear respuesta con estado de evaluación
      const rulesWithStatus = rules.map(rule => {
        const evaluations = rule.compliances.map(compliance => ({
          evaluationId: compliance.id,
          participantId: compliance.participant.id,
          participantName: compliance.participant.user.fullName || compliance.participant.user.username,
          isCompliant: compliance.isCompliant,
          judgeComments: compliance.judgeComments,
          evaluatedAt: compliance.evaluatedAt,
          isPending: compliance.isCompliant === null
        }));

        const pendingCount = evaluations.filter(e => e.isPending).length;
        const evaluatedCount = evaluations.filter(e => !e.isPending).length;

        return {
          ruleId: rule.id,
          description: rule.description,
          orderIndex: rule.orderIndex,
          isMandatory: rule.isMandatory,
          evaluations,
          statistics: {
            totalEvaluations: evaluations.length,
            pendingCount,
            evaluatedCount,
            isComplete: pendingCount === 0
          }
        };
      });

      const totalRules = rulesWithStatus.length;
      const completeRules = rulesWithStatus.filter(r => r.statistics.isComplete).length;
      const totalEvaluations = rulesWithStatus.reduce((sum, r) => sum + r.statistics.totalEvaluations, 0);
      const pendingEvaluations = rulesWithStatus.reduce((sum, r) => sum + r.statistics.pendingCount, 0);

      console.log(`📊 [RuleEvaluation] Estadísticas: ${completeRules}/${totalRules} reglas completas, ${pendingEvaluations} evaluaciones pendientes`);

      return {
        success: true,
        data: {
          challengeId,
          rules: rulesWithStatus,
          statistics: {
            totalRules,
            completeRules,
            pendingRules: totalRules - completeRules,
            totalEvaluations,
            pendingEvaluations,
            progressPercentage: totalEvaluations > 0 ? Math.round(((totalEvaluations - pendingEvaluations) / totalEvaluations) * 100) : 0
          }
        }
      };

    } catch (error) {
      console.error(`❌ [RuleEvaluation] Error obteniendo reglas pendientes:`, error);
      throw error;
    }
  }

  /**
   * Evaluar cumplimiento de una regla para un participante
   * @param {string} ruleId - ID de la regla
   * @param {string} participantId - ID del participante
   * @param {string} judgeId - ID del juez
   * @param {boolean} isCompliant - Si cumple o no la regla
   * @param {string} comments - Comentarios del juez
   * @returns {Promise<Object>} - Resultado de la evaluación
   */
  async evaluateRuleCompliance(ruleId, participantId, judgeId, isCompliant, comments = null) {
    const transaction = await sequelize.transaction();
    
    try {
      console.log(`⚖️ [RuleEvaluation] Evaluando regla ${ruleId} para participante ${participantId} por juez ${judgeId}`);
      console.log(`📝 [RuleEvaluation] Cumplimiento: ${isCompliant}, Comentarios: ${comments || 'Sin comentarios'}`);
      
      // Buscar el registro de compliance
      const compliance = await RuleCompliance.findOne({
        where: {
          ruleId,
          participantId
        },
        include: [
          {
            model: Rule,
            as: 'rule',
            include: [{ model: Challenge, as: 'challenge' }]
          },
          {
            model: Participant,
            as: 'participant',
            include: [{ model: User, as: 'user' }]
          }
        ],
        transaction
      });

      if (!compliance) {
        await transaction.rollback();
        throw new Error('Registro de evaluación no encontrado');
      }

      // Verificar permisos del juez
      if (compliance.judgeId !== judgeId) {
        await transaction.rollback();
        throw new Error('No tienes permisos para evaluar esta regla');
      }

      // Verificar que el desafío esté en estado correcto
      const challenge = compliance.rule.challenge;
      if (!['closed', 'judging'].includes(challenge.status)) {
        await transaction.rollback();
        throw new Error(`No se puede evaluar en estado: ${challenge.status}`);
      }

      // Actualizar evaluación
      await compliance.update({
        isCompliant,
        judgeComments: comments,
        evaluatedAt: new Date()
      }, { transaction });

      await transaction.commit();

      console.log(`✅ [RuleEvaluation] Evaluación guardada exitosamente`);

      return {
        success: true,
        message: 'Evaluación guardada exitosamente',
        data: {
          evaluationId: compliance.id,
          ruleId,
          participantId,
          participantName: compliance.participant.user.fullName || compliance.participant.user.username,
          ruleDescription: compliance.rule.description,
          isCompliant,
          judgeComments: comments,
          evaluatedAt: compliance.evaluatedAt
        }
      };

    } catch (error) {
      await transaction.rollback();
      console.error(`❌ [RuleEvaluation] Error evaluando regla:`, error);
      throw error;
    }
  }

  /**
   * Evaluar múltiples reglas en lote
   * @param {Array} evaluations - Array de evaluaciones
   * @param {string} judgeId - ID del juez
   * @returns {Promise<Object>} - Resultado de las evaluaciones
   */
  async evaluateMultipleRules(evaluations, judgeId) {
    const transaction = await sequelize.transaction();
    
    try {
      console.log(`📦 [RuleEvaluation] Evaluando ${evaluations.length} reglas en lote por juez ${judgeId}`);
      
      const results = [];
      const errors = [];

      for (const evaluation of evaluations) {
        try {
          const result = await this.evaluateRuleCompliance(
            evaluation.ruleId,
            evaluation.participantId,
            judgeId,
            evaluation.isCompliant,
            evaluation.comments
          );
          results.push(result.data);
        } catch (error) {
          errors.push({
            ruleId: evaluation.ruleId,
            participantId: evaluation.participantId,
            error: error.message
          });
        }
      }

      if (errors.length > 0) {
        await transaction.rollback();
        return {
          success: false,
          message: 'Algunas evaluaciones fallaron',
          data: { results, errors }
        };
      }

      await transaction.commit();

      console.log(`✅ [RuleEvaluation] ${results.length} evaluaciones completadas exitosamente`);

      return {
        success: true,
        message: 'Todas las evaluaciones completadas exitosamente',
        data: { results, errors: [] }
      };

    } catch (error) {
      await transaction.rollback();
      console.error(`❌ [RuleEvaluation] Error en evaluación múltiple:`, error);
      throw error;
    }
  }

  /**
   * Obtener historial de evaluaciones de un desafío
   * @param {string} challengeId - ID del desafío
   * @returns {Promise<Object>} - Historial completo
   */
  async getEvaluationHistory(challengeId) {
    try {
      console.log(`📚 [RuleEvaluation] Obteniendo historial de evaluaciones para desafío ${challengeId}`);
      
      const evaluations = await RuleCompliance.findAll({
        include: [
          {
            model: Rule,
            as: 'rule',
            where: { challengeId }
          },
          {
            model: Participant,
            as: 'participant',
            include: [{ model: User, as: 'user' }]
          },
          {
            model: User,
            as: 'judge'
          }
        ],
        order: [['evaluatedAt', 'DESC']]
      });

      const history = evaluations.map(evaluation => ({
        evaluationId: evaluation.id,
        ruleDescription: evaluation.rule.description,
        participantName: evaluation.participant.user.fullName || evaluation.participant.user.username,
        judgeName: evaluation.judge.fullName || evaluation.judge.username,
        isCompliant: evaluation.isCompliant,
        judgeComments: evaluation.judgeComments,
        evaluatedAt: evaluation.evaluatedAt,
        isEvaluated: evaluation.isCompliant !== null
      }));

      const totalEvaluations = history.length;
      const completedEvaluations = history.filter(h => h.isEvaluated).length;
      const pendingEvaluations = totalEvaluations - completedEvaluations;

      return {
        success: true,
        data: {
          challengeId,
          history,
          statistics: {
            totalEvaluations,
            completedEvaluations,
            pendingEvaluations,
            completionPercentage: totalEvaluations > 0 ? Math.round((completedEvaluations / totalEvaluations) * 100) : 0
          }
        }
      };

    } catch (error) {
      console.error(`❌ [RuleEvaluation] Error obteniendo historial:`, error);
      throw error;
    }
  }
}

module.exports = new RuleEvaluationService();
