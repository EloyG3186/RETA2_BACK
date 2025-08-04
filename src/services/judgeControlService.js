const { Challenge, Rule, RuleCompliance, Participant, User } = require('../models');
const { sequelize } = require('../config/database');
const WinnerDeterminationService = require('./winnerDeterminationService');

class JudgeControlService {
  /**
   * Cerrar desafío - Bloquear evidencias y preparar para evaluación
   * @param {string} challengeId - ID del desafío
   * @param {string} judgeId - ID del juez
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async closeChallenge(challengeId, judgeId) {
    const transaction = await sequelize.transaction();
    
    try {
      console.log(`🔒 [JudgeControl] Cerrando desafío ${challengeId} por juez ${judgeId}`);
      
      // 1. Verificar que el desafío existe y el usuario es el juez
      const challenge = await Challenge.findByPk(challengeId, {
        include: [
          {
            model: Participant,
            as: 'participants',
            include: [{ model: User, as: 'user' }]
          },
          {
            model: Rule,
            as: 'rules'
          }
        ],
        transaction
      });

      if (!challenge) {
        await transaction.rollback();
        throw new Error('Desafío no encontrado');
      }

      if (challenge.judgeId !== judgeId) {
        await transaction.rollback();
        throw new Error('Solo el juez asignado puede cerrar el desafío');
      }

      if (challenge.status !== 'in_progress') {
        await transaction.rollback();
        throw new Error(`No se puede cerrar un desafío en estado: ${challenge.status}`);
      }

      // 2. Verificar que hay participantes y reglas
      if (!challenge.participants || challenge.participants.length === 0) {
        await transaction.rollback();
        throw new Error('El desafío debe tener participantes para poder cerrarse');
      }

      if (!challenge.rules || challenge.rules.length === 0) {
        await transaction.rollback();
        throw new Error('El desafío debe tener reglas para poder cerrarse');
      }

      // 3. Cambiar estado a 'closed' y registrar timestamp
      await challenge.update({
        status: 'closed',
        closedAt: new Date()
      }, { transaction });

      // 4. Crear registros de rule_compliance para cada participante/regla
      const complianceRecords = [];
      for (const participant of challenge.participants) {
        for (const rule of challenge.rules) {
          complianceRecords.push({
            ruleId: rule.id,
            participantId: participant.id,
            judgeId: judgeId,
            isCompliant: null, // Pendiente de evaluación
            judgeComments: null,
            evaluatedAt: null
          });
        }
      }

      await RuleCompliance.bulkCreate(complianceRecords, { transaction });

      await transaction.commit();

      console.log(`✅ [JudgeControl] Desafío ${challengeId} cerrado exitosamente`);
      console.log(`📋 [JudgeControl] Creados ${complianceRecords.length} registros de evaluación`);

      return {
        success: true,
        message: 'Desafío cerrado exitosamente',
        data: {
          challengeId,
          status: 'closed',
          closedAt: challenge.closedAt,
          totalEvaluations: complianceRecords.length,
          participantsCount: challenge.participants.length,
          rulesCount: challenge.rules.length
        }
      };

    } catch (error) {
      await transaction.rollback();
      console.error(`❌ [JudgeControl] Error cerrando desafío ${challengeId}:`, error);
      throw error;
    }
  }

  /**
   * Determinar ganador - Ejecutar algoritmo de validación
   * @param {string} challengeId - ID del desafío
   * @param {string} judgeId - ID del juez
   * @returns {Promise<Object>} - Resultado de la determinación
   */
  async determineWinner(challengeId, judgeId) {
    const transaction = await sequelize.transaction();
    
    try {
      console.log(`🏆 [JudgeControl] Determinando ganador para desafío ${challengeId} por juez ${judgeId}`);
      
      // 1. Verificar que el desafío existe y el usuario es el juez
      const challenge = await Challenge.findByPk(challengeId, { transaction });

      if (!challenge) {
        await transaction.rollback();
        throw new Error('Desafío no encontrado');
      }

      if (challenge.judgeId !== judgeId) {
        await transaction.rollback();
        throw new Error('Solo el juez asignado puede determinar el ganador');
      }

      if (!['closed', 'judging'].includes(challenge.status)) {
        await transaction.rollback();
        throw new Error(`No se puede determinar ganador en estado: ${challenge.status}`);
      }

      // 2. Verificar que todas las reglas están evaluadas
      const canDetermineResult = await this.canDetermineWinner(challengeId);
      
      if (!canDetermineResult.canDetermine) {
        await transaction.rollback();
        return {
          success: false,
          message: 'No se puede determinar el ganador aún',
          error: 'Hay reglas pendientes de evaluación',
          data: {
            pendingRules: canDetermineResult.pendingRules,
            totalPending: canDetermineResult.pendingRules.length
          }
        };
      }

      // 3. Cambiar estado a 'judging' si no lo está
      if (challenge.status === 'closed') {
        await challenge.update({
          status: 'judging',
          judgingStartedAt: new Date()
        }, { transaction });
      }

      // 4. Ejecutar algoritmo de determinación de ganador
      const winnerResult = await WinnerDeterminationService.determineWinnerByRules(challengeId, transaction);

      // 5. Actualizar challenge con resultado
      await challenge.update({
        status: 'completed',
        winnerId: winnerResult.winnerId,
        winnerReason: winnerResult.reason,
        completedAt: new Date()
      }, { transaction });

      await transaction.commit();

      console.log(`✅ [JudgeControl] Ganador determinado para desafío ${challengeId}`);
      console.log(`🏆 [JudgeControl] Ganador: ${winnerResult.winnerId || 'EMPATE'}`);
      console.log(`📝 [JudgeControl] Razón: ${winnerResult.reason}`);

      return {
        success: true,
        message: 'Ganador determinado exitosamente',
        data: {
          challengeId,
          winnerId: winnerResult.winnerId,
          winnerReason: winnerResult.reason,
          isWinner: winnerResult.winnerId !== null,
          isTie: winnerResult.winnerId === null,
          completedAt: new Date()
        }
      };

    } catch (error) {
      await transaction.rollback();
      console.error(`❌ [JudgeControl] Error determinando ganador ${challengeId}:`, error);
      throw error;
    }
  }

  /**
   * Verificar si se puede determinar ganador
   * @param {string} challengeId - ID del desafío
   * @returns {Promise<Object>} - Estado de evaluación
   */
  async canDetermineWinner(challengeId) {
    try {
      console.log(`🔍 [JudgeControl] Verificando si se puede determinar ganador para ${challengeId}`);
      
      // 1. Obtener todas las reglas del desafío
      const rules = await Rule.findAll({
        where: { challengeId }
      });
      
      // 2. Obtener todos los participantes del desafío
      const participants = await Participant.findAll({
        where: { challengeId },
        include: [{ model: User, as: 'user' }]
      });
      
      console.log(`📊 [JudgeControl] Reglas: ${rules.length}, Participantes: ${participants.length}`);
      
      // 3. Calcular total de evaluaciones requeridas
      const totalRequired = rules.length * participants.length;
      
      // 4. Obtener todas las evaluaciones existentes
      const existingEvaluations = await RuleCompliance.findAll({
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
          }
        ]
      });
      
      console.log(`📊 [JudgeControl] Evaluaciones existentes: ${existingEvaluations.length}/${totalRequired}`);
      
      // 5. Identificar combinaciones regla-participante sin evaluación
      const pendingRules = [];
      
      for (const rule of rules) {
        for (const participant of participants) {
          const evaluation = existingEvaluations.find(evaluation => 
            evaluation.ruleId === rule.id && evaluation.participantId === participant.id
          );
          
          if (!evaluation || evaluation.isCompliant === null) {
            pendingRules.push({
              ruleId: rule.id,
              ruleDescription: rule.description,
              participantId: participant.id,
              participantName: participant.user.fullName || participant.user.username,
              evaluationId: evaluation?.id || null,
              status: !evaluation ? 'missing' : 'pending'
            });
          }
        }
      }
      
      const canDetermine = pendingRules.length === 0;
      
      console.log(`📊 [JudgeControl] ========== RESUMEN DE EVALUACIÓN ==========`);
      console.log(`📊 [JudgeControl] Total requerido: ${totalRequired}`);
      console.log(`📊 [JudgeControl] Total completado: ${totalRequired - pendingRules.length}`);
      console.log(`📊 [JudgeControl] Total pendiente: ${pendingRules.length}`);
      console.log(`📊 [JudgeControl] ¿Puede determinar ganador?: ${canDetermine}`);
      
      if (pendingRules.length > 0) {
        console.log(`📊 [JudgeControl] REGLAS PENDIENTES:`);
        pendingRules.forEach((p, index) => {
          console.log(`  ${index + 1}. ${p.ruleDescription} (${p.participantName}) - Estado: ${p.status}`);
        });
      } else {
        console.log(`✅ [JudgeControl] TODAS LAS REGLAS ESTÁN EVALUADAS`);
      }
      
      return {
        canDetermine,
        pendingRules,
        totalPending: pendingRules.length,
        totalRequired,
        totalCompleted: totalRequired - pendingRules.length
      };

    } catch (error) {
      console.error(`❌ [JudgeControl] Error verificando estado de evaluación:`, error);
      throw error;
    }
  }

  /**
   * Obtener estado del desafío para el juez
   * @param {string} challengeId - ID del desafío
   * @param {string} judgeId - ID del juez
   * @returns {Promise<Object>} - Estado completo del desafío
   */
  async getChallengeJudgeStatus(challengeId, judgeId) {
    try {
      console.log(`📊 [JudgeControl] Obteniendo estado para juez ${judgeId} en desafío ${challengeId}`);
      
      const challenge = await Challenge.findByPk(challengeId, {
        include: [
          {
            model: Rule,
            as: 'rules',
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
            }]
          },
          {
            model: Participant,
            as: 'participants',
            include: [{ model: User, as: 'user' }]
          }
        ]
      });

      if (!challenge) {
        throw new Error('Desafío no encontrado');
      }

      if (challenge.judgeId !== judgeId) {
        throw new Error('No tienes permisos para ver este desafío');
      }

      // Calcular estadísticas
      const totalRules = challenge.rules.length;
      const totalParticipants = challenge.participants.length;
      const totalEvaluations = totalRules * totalParticipants;
      
      let evaluatedCount = 0;
      let pendingCount = 0;

      challenge.rules.forEach(rule => {
        rule.compliances.forEach(compliance => {
          if (compliance.isCompliant !== null) {
            evaluatedCount++;
          } else {
            pendingCount++;
          }
        });
      });

      const canDetermineResult = await this.canDetermineWinner(challengeId);

      return {
        success: true,
        data: {
          challenge: {
            id: challenge.id,
            title: challenge.title,
            status: challenge.status,
            closedAt: challenge.closedAt,
            judgingStartedAt: challenge.judgingStartedAt,
            completedAt: challenge.completedAt
          },
          statistics: {
            totalRules,
            totalParticipants,
            totalEvaluations,
            evaluatedCount,
            pendingCount,
            progressPercentage: totalEvaluations > 0 ? Math.round((evaluatedCount / totalEvaluations) * 100) : 0
          },
          canDetermineWinner: canDetermineResult.canDetermine,
          pendingEvaluations: canDetermineResult.pendingRules,
          actions: {
            canClose: challenge.status === 'in_progress',
            canEvaluate: ['closed', 'judging'].includes(challenge.status),
            canDetermineWinner: canDetermineResult.canDetermine && ['closed', 'judging'].includes(challenge.status)
          }
        }
      };

    } catch (error) {
      console.error(`❌ [JudgeControl] Error obteniendo estado del desafío:`, error);
      throw error;
    }
  }
}

module.exports = new JudgeControlService();
