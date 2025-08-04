const { Challenge, Rule, RuleCompliance, Participant, User } = require('../models');

class WinnerDeterminationService {
  /**
   * Determinar ganador basado en cumplimiento de reglas
   * @param {string} challengeId - ID del desafío
   * @param {Object} transaction - Transacción de base de datos (opcional)
   * @returns {Promise<Object>} - Resultado con winnerId y reason
   */
  async determineWinnerByRules(challengeId, transaction = null) {
    try {
      console.log(`🏆 [WinnerDetermination] Iniciando determinación para desafío ${challengeId}`);
      
      // 1. Obtener todas las evaluaciones del desafío
      const evaluations = await RuleCompliance.findAll({
        include: [
          {
            model: Rule,
            as: 'rule',
            where: { challengeId },
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

      if (evaluations.length === 0) {
        throw new Error('No se encontraron evaluaciones para este desafío');
      }

      console.log(`📊 [WinnerDetermination] Evaluaciones encontradas: ${evaluations.length}`);

      // 2. Calcular estadísticas por participante
      const stats = this.calculateComplianceStats(evaluations);
      console.log(`📈 [WinnerDetermination] Estadísticas calculadas:`, stats);

      // 3. Determinar resultado
      const result = this.determineResult(stats);
      console.log(`🎯 [WinnerDetermination] Resultado determinado:`, result);

      // 4. Generar razón transparente
      const reason = this.generateWinnerReason(result, stats);
      console.log(`📝 [WinnerDetermination] Razón generada: ${reason}`);

      return {
        winnerId: result.winnerId,
        reason: reason,
        statistics: stats,
        resultType: result.type
      };

    } catch (error) {
      console.error(`❌ [WinnerDetermination] Error determinando ganador:`, error);
      throw error;
    }
  }

  /**
   * Calcular estadísticas de cumplimiento por participante
   * @param {Array} evaluations - Array de evaluaciones
   * @returns {Array} - Estadísticas por participante
   */
  calculateComplianceStats(evaluations) {
    const participantStats = {};

    // Agrupar evaluaciones por participante
    evaluations.forEach(evaluation => {
      const participantId = evaluation.participant.id;
      const participantName = evaluation.participant.user.fullName || evaluation.participant.user.username;
      const isMandatory = evaluation.rule.isMandatory;
      const isCompliant = evaluation.isCompliant;

      if (!participantStats[participantId]) {
        participantStats[participantId] = {
          participantId,
          participantName,
          totalRules: 0,
          mandatoryRules: 0,
          optionalRules: 0,
          compliantRules: 0,
          mandatoryCompliant: 0,
          optionalCompliant: 0,
          compliancePercentage: 0,
          mandatoryCompliancePercentage: 0,
          evaluations: []
        };
      }

      const stats = participantStats[participantId];
      
      // Contar reglas
      stats.totalRules++;
      if (isMandatory) {
        stats.mandatoryRules++;
      } else {
        stats.optionalRules++;
      }

      // Contar cumplimientos
      if (isCompliant === true) {
        stats.compliantRules++;
        if (isMandatory) {
          stats.mandatoryCompliant++;
        } else {
          stats.optionalCompliant++;
        }
      }

      // Guardar evaluación individual
      stats.evaluations.push({
        ruleId: evaluation.rule.id,
        ruleDescription: evaluation.rule.description,
        isMandatory,
        isCompliant,
        judgeComments: evaluation.judgeComments
      });
    });

    // Calcular porcentajes
    Object.values(participantStats).forEach(stats => {
      stats.compliancePercentage = stats.totalRules > 0 
        ? Math.round((stats.compliantRules / stats.totalRules) * 100) 
        : 0;
      
      stats.mandatoryCompliancePercentage = stats.mandatoryRules > 0 
        ? Math.round((stats.mandatoryCompliant / stats.mandatoryRules) * 100) 
        : 100; // Si no hay reglas obligatorias, considera 100%
    });

    return Object.values(participantStats);
  }

  /**
   * Determinar resultado basado en estadísticas
   * @param {Array} stats - Estadísticas por participante
   * @returns {Object} - Resultado con winnerId y type
   */
  determineResult(stats) {
    if (stats.length === 0) {
      return { winnerId: null, type: 'no_participants' };
    }

    if (stats.length === 1) {
      return { winnerId: stats[0].participantId, type: 'single_participant' };
    }

    // Ordenar por criterios de ganador:
    // 1. Mayor porcentaje de reglas obligatorias cumplidas
    // 2. Mayor número de reglas obligatorias cumplidas
    // 3. Mayor porcentaje total de cumplimiento
    // 4. Mayor número total de reglas cumplidas
    const sortedStats = [...stats].sort((a, b) => {
      // Criterio 1: Porcentaje de reglas obligatorias
      if (a.mandatoryCompliancePercentage !== b.mandatoryCompliancePercentage) {
        return b.mandatoryCompliancePercentage - a.mandatoryCompliancePercentage;
      }
      
      // Criterio 2: Número de reglas obligatorias cumplidas
      if (a.mandatoryCompliant !== b.mandatoryCompliant) {
        return b.mandatoryCompliant - a.mandatoryCompliant;
      }
      
      // Criterio 3: Porcentaje total de cumplimiento
      if (a.compliancePercentage !== b.compliancePercentage) {
        return b.compliancePercentage - a.compliancePercentage;
      }
      
      // Criterio 4: Número total de reglas cumplidas
      return b.compliantRules - a.compliantRules;
    });

    const winner = sortedStats[0];
    const runnerUp = sortedStats[1];

    // Verificar empate
    const isTie = (
      winner.mandatoryCompliancePercentage === runnerUp.mandatoryCompliancePercentage &&
      winner.mandatoryCompliant === runnerUp.mandatoryCompliant &&
      winner.compliancePercentage === runnerUp.compliancePercentage &&
      winner.compliantRules === runnerUp.compliantRules
    );

    if (isTie) {
      return { winnerId: null, type: 'tie', participants: [winner, runnerUp] };
    }

    return { winnerId: winner.participantId, type: 'winner', winner, runnerUp };
  }

  /**
   * Generar razón transparente del resultado
   * @param {Object} result - Resultado de la determinación
   * @param {Array} stats - Estadísticas por participante
   * @returns {string} - Razón explicativa
   */
  generateWinnerReason(result, stats) {
    switch (result.type) {
      case 'no_participants':
        return 'No hay participantes en el desafío';

      case 'single_participant':
        const singleParticipant = stats[0];
        return `${singleParticipant.participantName} gana por ser el único participante (${singleParticipant.compliantRules}/${singleParticipant.totalRules} reglas cumplidas - ${singleParticipant.compliancePercentage}%)`;

      case 'tie':
        const tieParticipants = result.participants;
        return `Empate entre ${tieParticipants[0].participantName} y ${tieParticipants[1].participantName}: ambos cumplieron ${tieParticipants[0].compliantRules}/${tieParticipants[0].totalRules} reglas (${tieParticipants[0].compliancePercentage}%), incluyendo ${tieParticipants[0].mandatoryCompliant}/${tieParticipants[0].mandatoryRules} reglas obligatorias (${tieParticipants[0].mandatoryCompliancePercentage}%)`;

      case 'winner':
        const winner = result.winner;
        const runnerUp = result.runnerUp;
        
        // Determinar la razón principal del triunfo
        let mainReason = '';
        
        if (winner.mandatoryCompliancePercentage > runnerUp.mandatoryCompliancePercentage) {
          mainReason = `mayor cumplimiento de reglas obligatorias (${winner.mandatoryCompliant}/${winner.mandatoryRules} = ${winner.mandatoryCompliancePercentage}% vs ${runnerUp.mandatoryCompliant}/${runnerUp.mandatoryRules} = ${runnerUp.mandatoryCompliancePercentage}%)`;
        } else if (winner.mandatoryCompliant > runnerUp.mandatoryCompliant) {
          mainReason = `mayor número de reglas obligatorias cumplidas (${winner.mandatoryCompliant} vs ${runnerUp.mandatoryCompliant})`;
        } else if (winner.compliancePercentage > runnerUp.compliancePercentage) {
          mainReason = `mayor porcentaje total de cumplimiento (${winner.compliancePercentage}% vs ${runnerUp.compliancePercentage}%)`;
        } else {
          mainReason = `mayor número total de reglas cumplidas (${winner.compliantRules} vs ${runnerUp.compliantRules})`;
        }

        return `${winner.participantName} gana con ${mainReason}. Resultado final: ${winner.participantName} ${winner.compliantRules}/${winner.totalRules} reglas (${winner.compliancePercentage}%) vs ${runnerUp.participantName} ${runnerUp.compliantRules}/${runnerUp.totalRules} reglas (${runnerUp.compliancePercentage}%)`;

      default:
        return 'Resultado indeterminado';
    }
  }

  /**
   * Obtener estadísticas detalladas de un desafío
   * @param {string} challengeId - ID del desafío
   * @returns {Promise<Object>} - Estadísticas completas
   */
  async getChallengeComplianceStats(challengeId) {
    try {
      console.log(`📊 [WinnerDetermination] Obteniendo estadísticas para desafío ${challengeId}`);
      
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
          }
        ]
      });

      if (evaluations.length === 0) {
        return {
          success: false,
          message: 'No se encontraron evaluaciones para este desafío'
        };
      }

      const stats = this.calculateComplianceStats(evaluations);
      const result = this.determineResult(stats);
      const reason = this.generateWinnerReason(result, stats);

      return {
        success: true,
        data: {
          participantStats: stats,
          currentResult: result,
          predictedReason: reason,
          totalEvaluations: evaluations.length,
          challengeId
        }
      };

    } catch (error) {
      console.error(`❌ [WinnerDetermination] Error obteniendo estadísticas:`, error);
      throw error;
    }
  }
}

module.exports = new WinnerDeterminationService();
