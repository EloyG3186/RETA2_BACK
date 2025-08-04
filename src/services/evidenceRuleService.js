const { EvidenceRuleCompliance, Evidence, Rule, Participant, User, Challenge } = require('../models');
const { Op } = require('sequelize');

class EvidenceRuleService {
  
  /**
   * Vincula una evidencia con reglas específicas
   */
  async linkEvidenceToRules(evidenceId, ruleIds, userId) {
    try {
      // Verificar que la evidencia existe y pertenece al usuario
      const evidence = await Evidence.findOne({
        where: { id: evidenceId, userId: userId },
        include: [{ model: Challenge, as: 'challenge' }]
      });

      if (!evidence) {
        throw new Error('Evidencia no encontrada o no pertenece al usuario');
      }

      const challengeId = evidence.challengeId;

      // Obtener el participante
      const participant = await Participant.findOne({
        where: { challengeId: challengeId, userId: userId }
      });

      if (!participant) {
        throw new Error('Usuario no es participante del desafío');
      }

      // Verificar que las reglas pertenecen al desafío
      const rules = await Rule.findAll({
        where: { 
          id: { [Op.in]: ruleIds },
          challengeId: challengeId
        }
      });

      if (rules.length !== ruleIds.length) {
        throw new Error('Algunas reglas no pertenecen al desafío');
      }

      // Crear los vínculos
      const links = [];
      for (const rule of rules) {
        const [link, created] = await EvidenceRuleCompliance.findOrCreate({
          where: {
            evidenceId: evidenceId,
            ruleId: rule.id,
            participantId: participant.id
          },
          defaults: {
            userId: userId,
            challengeId: challengeId,
            claimedCompliance: true
          }
        });
        links.push(link);
      }

      return {
        success: true,
        message: `Evidencia vinculada a ${links.length} reglas`,
        links: links
      };

    } catch (error) {
      console.error('Error vinculando evidencia a reglas:', error);
      throw error;
    }
  }

  /**
   * Obtiene la matriz de evaluación para un desafío
   */
  async getEvaluationMatrix(challengeId, judgeId) {
    try {
      // Verificar que el usuario es juez del desafío
      const challenge = await Challenge.findOne({
        where: { id: challengeId, judgeId: judgeId }
      });

      if (!challenge) {
        throw new Error('No tienes permisos para evaluar este desafío');
      }

      // Obtener participantes
      const participants = await Participant.findAll({
        where: { challengeId: challengeId },
        include: [{ model: User, as: 'user', attributes: ['id', 'username', 'fullName'] }]
      });

      // Obtener reglas
      const rules = await Rule.findAll({
        where: { challengeId: challengeId },
        order: [['orderIndex', 'ASC']]
      });

      // Obtener vínculos evidencia-regla
      const evidenceRuleLinks = await EvidenceRuleCompliance.findAll({
        where: { challengeId: challengeId },
        include: [
          { model: Evidence, as: 'evidence' },
          { model: Rule, as: 'rule' },
          { model: User, as: 'user', attributes: ['id', 'username', 'fullName'] }
        ]
      });

      // Obtener evaluaciones existentes
      const { RuleCompliance } = require('../models');
      const evaluations = await RuleCompliance.findAll({
        where: { 
          ruleId: { [Op.in]: rules.map(r => r.id) },
          participantId: { [Op.in]: participants.map(p => p.id) }
        }
      });

      // Construir matriz
      const matrix = participants.map(participant => {
        const participantEvaluations = rules.map(rule => {
          const evaluation = evaluations.find(e => 
            e.ruleId === rule.id && e.participantId === participant.id
          );
          
          const linkedEvidences = evidenceRuleLinks.filter(link =>
            link.ruleId === rule.id && link.userId === participant.userId
          );

          return {
            ruleId: rule.id,
            ruleName: rule.description,
            participantId: participant.id,
            isCompliant: evaluation ? evaluation.isCompliant : null,
            judgeComments: evaluation ? evaluation.judgeComments : null,
            evaluatedAt: evaluation ? evaluation.evaluatedAt : null,
            autoEvaluated: evaluation ? evaluation.autoEvaluated : false,
            linkedEvidences: linkedEvidences.map(link => ({
              evidenceId: link.evidenceId,
              evidenceType: link.evidence.type,
              evidenceDescription: link.evidence.description
            }))
          };
        });

        return {
          participant: {
            id: participant.id,
            userId: participant.userId,
            username: participant.user.username,
            fullName: participant.user.fullName
          },
          evaluations: participantEvaluations
        };
      });

      return {
        success: true,
        data: {
          challenge: {
            id: challenge.id,
            title: challenge.title,
            status: challenge.status
          },
          rules: rules,
          matrix: matrix
        }
      };

    } catch (error) {
      console.error('Error obteniendo matriz de evaluación:', error);
      throw error;
    }
  }

  /**
   * Obtiene evidencias vinculadas a reglas para un participante
   */
  async getParticipantEvidenceRuleLinks(challengeId, userId) {
    try {
      const links = await EvidenceRuleCompliance.findAll({
        where: { challengeId: challengeId, userId: userId },
        include: [
          { model: Evidence, as: 'evidence' },
          { model: Rule, as: 'rule' }
        ],
        order: [['rule', 'orderIndex', 'ASC']]
      });

      return {
        success: true,
        data: links
      };

    } catch (error) {
      console.error('Error obteniendo vínculos de evidencia-regla:', error);
      throw error;
    }
  }

  /**
   * Verifica completitud de evaluaciones antes de determinar ganador
   */
  async checkEvaluationCompleteness(challengeId) {
    try {
      // Obtener participantes y reglas
      const participants = await Participant.findAll({
        where: { challengeId: challengeId }
      });

      const rules = await Rule.findAll({
        where: { challengeId: challengeId }
      });

      // Obtener evaluaciones existentes
      const { RuleCompliance } = require('../models');
      const evaluations = await RuleCompliance.findAll({
        where: { 
          ruleId: { [Op.in]: rules.map(r => r.id) },
          participantId: { [Op.in]: participants.map(p => p.id) }
        }
      });

      const totalRequired = participants.length * rules.length;
      // Solo contar evaluaciones que realmente han sido completadas (isCompliant no es null)
      const completedEvaluations = evaluations.filter(e => e.isCompliant !== null);
      const totalCompleted = completedEvaluations.length;
      const isComplete = totalCompleted === totalRequired;

      const pendingEvaluations = [];
      if (!isComplete) {
        for (const participant of participants) {
          for (const rule of rules) {
            const evaluation = evaluations.find(e => 
              e.ruleId === rule.id && e.participantId === participant.id
            );
            // Pendiente si no existe evaluación O si existe pero isCompliant es null
            if (!evaluation || evaluation.isCompliant === null) {
              pendingEvaluations.push({
                participantId: participant.id,
                ruleId: rule.id,
                ruleName: rule.description
              });
            }
          }
        }
      }

      return {
        success: true,
        data: {
          isComplete: isComplete,
          totalRequired: totalRequired,
          totalCompleted: totalCompleted,
          pendingEvaluations: pendingEvaluations
        }
      };

    } catch (error) {
      console.error('Error verificando completitud de evaluaciones:', error);
      throw error;
    }
  }
}

module.exports = new EvidenceRuleService();
