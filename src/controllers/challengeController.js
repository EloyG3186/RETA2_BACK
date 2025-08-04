const { Op, Transaction } = require('sequelize');
const { sequelize, Challenge, User, Participant, Comment, TimelineEvent, Category, Rule, Evidence, RuleCompliance, EvidenceRuleCompliance } = require('../models');
const notificationController = require('./notificationController');
const gamificationService = require('../services/gamificationService');
const ruleEvaluationService = require('../services/ruleEvaluationService');

/**
 * Normaliza los datos del retador en un desafío
 * @param {Object} challenge - El desafío a normalizar
 * @returns {Promise<void>}
 */
async function normalizeChallenger(challenge) {
  try {
    // Verificar que challenge es un objeto válido
    if (!challenge || typeof challenge !== 'object') {
      console.log('El desafío no es un objeto válido');
      return;
    }

    // Si no hay ID, no podemos hacer mucho
    if (!challenge.id) {
      console.log('El desafío no tiene ID');
      return;
    }

    // Si ya tenemos la información completa del retador, no hacemos nada
    if (challenge.challenger && challenge.challenger.username) {
      console.log(`Desafío ${challenge.id} ya tiene información completa del retador:`, challenge.challenger.username);
      return;
    }
    
    // Si tenemos el ID del retador pero no su información completa
    if (challenge.challengerId) {
      console.log(`Buscando información del retador con ID ${challenge.challengerId} para el desafío ${challenge.id}`);
      try {
        const retador = await User.findByPk(challenge.challengerId, {
          attributes: ['id', 'username', 'email', 'profilePicture', 'fullName']
        });
        
        if (retador) {
          challenge.challenger = retador.toJSON();
          console.log(`Información del retador encontrada:`, challenge.challenger.username);
        } else {
          console.log(`No se encontró información para el retador con ID ${challenge.challengerId}`);
          // Asignar un objeto challenger vacío para evitar errores
          challenge.challenger = { id: challenge.challengerId, username: 'Usuario desconocido' };
        }
      } catch (err) {
        console.error(`Error al buscar el retador con ID ${challenge.challengerId}:`, err);
        // Asignar un objeto challenger vacío para evitar errores
        challenge.challenger = { id: challenge.challengerId, username: 'Usuario desconocido' };
      }
      return;
    }
    
    // Si no tenemos el ID del retador, intentamos encontrarlo en los participantes
    if (challenge.participants && Array.isArray(challenge.participants)) {
      console.log(`Buscando retador en los participantes del desafío ${challenge.id}`);
      
      try {
        // Filtrar participantes que no sean el creador
        const retadorParticipant = challenge.participants.find(p => 
          p && p.userId && challenge.creatorId && 
          p.userId !== challenge.creatorId && 
          (p.role === 'challenger' || !p.role)
        );
        
        if (retadorParticipant && retadorParticipant.userId) {
          console.log(`Participante retador encontrado:`, retadorParticipant.userId);
          
          // Buscar la información completa del usuario
          const retador = await User.findByPk(retadorParticipant.userId, {
            attributes: ['id', 'username', 'email', 'profilePicture', 'fullName']
          });
          
          if (retador) {
            challenge.challenger = retador.toJSON();
            challenge.challengerId = retador.id;
            console.log(`Información del retador encontrada:`, challenge.challenger.username);
            
            try {
              // Actualizar el desafío en la base de datos para guardar el challengerId
              await Challenge.update(
                { challengerId: retador.id },
                { where: { id: challenge.id } }
              );
              
              // Actualizar el rol del participante
              await Participant.update(
                { role: 'challenger' },
                { where: { challengeId: challenge.id, userId: retador.id } }
              );
            } catch (updateErr) {
              console.error(`Error al actualizar el desafío o participante:`, updateErr);
              // Continuamos aunque falle la actualización
            }
          } else {
            console.log(`No se encontró información para el usuario ${retadorParticipant.userId}`);
            // Asignar un objeto challenger vacío para evitar errores
            challenge.challenger = { id: retadorParticipant.userId, username: 'Usuario desconocido' };
          }
        } else {
          console.log(`No se encontró participante retador para el desafío ${challenge.id}`);
          // Asignar un objeto challenger vacío para evitar errores
          challenge.challenger = { id: 'unknown', username: 'Sin retador' };
        }
      } catch (participantErr) {
        console.error(`Error al procesar los participantes:`, participantErr);
        // Asignar un objeto challenger vacío para evitar errores
        challenge.challenger = { id: 'unknown', username: 'Sin retador' };
      }
    } else {
      console.log(`El desafío ${challenge.id} no tiene participantes o no es un array`);
      // Asignar un objeto challenger vacío para evitar errores
      challenge.challenger = { id: 'unknown', username: 'Sin retador' };
    }
  } catch (error) {
    console.error('Error al normalizar los datos del retador:', error);
    // Asegurarnos de que challenge.challenger siempre exista para evitar errores
    if (challenge && typeof challenge === 'object') {
      challenge.challenger = { id: 'unknown', username: 'Sin retador' };
    }
  }
}

// Crear reglas para un desafío existente
exports.addChallengeRules = async (req, res) => {
  console.log('🚀 [addChallengeRules] INICIO - Función llamada');
  
  try {
    const { id: challengeId } = req.params;
    const { rules } = req.body;
    
    console.log('📍 [addChallengeRules] Parámetros recibidos:');
    console.log('  - challengeId:', challengeId);
    console.log('  - rules:', rules);
    console.log('  - req.user:', req.user);
    
    // Validar que el desafío existe
    console.log('🔍 [addChallengeRules] Buscando desafío en base de datos...');
    
    let challenge;
    try {
      challenge = await Challenge.findByPk(challengeId);
      console.log('🔍 [addChallengeRules] Resultado de búsqueda:', challenge ? 'ENCONTRADO' : 'NO ENCONTRADO');
    } catch (dbError) {
      console.error('❌ [addChallengeRules] Error en consulta de base de datos:', dbError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al consultar la base de datos',
        error: dbError.message 
      });
    }
    
    if (!challenge) {
      console.log('❌ [addChallengeRules] Desafío no encontrado');
      return res.status(404).json({ 
        success: false, 
        message: 'Desafío no encontrado' 
      });
    }
    
    console.log('✅ [addChallengeRules] Desafío encontrado:');
    console.log('  - ID:', challenge.id);
    console.log('  - Título:', challenge.title);
    console.log('  - CreatorId:', challenge.creatorId);
    console.log('  - Tipo creatorId:', typeof challenge.creatorId);
    
    // Validar usuario
    console.log('🔍 [addChallengeRules] Validando usuario:');
    console.log('  - req.user.id:', req.user.id);
    console.log('  - Tipo req.user.id:', typeof req.user.id);
    console.log('  - Comparación ===:', challenge.creatorId === req.user.id);
    console.log('  - Comparación ==:', challenge.creatorId == req.user.id);
    
    if (challenge.creatorId !== req.user.id) {
      console.log('❌ [addChallengeRules] AUTORIZACIÓN FALLIDA');
      console.log('  - Expected:', challenge.creatorId);
      console.log('  - Received:', req.user.id);
      return res.status(403).json({ 
        success: false, 
        message: 'Solo el creador puede agregar reglas al desafío' 
      });
    }
    
    console.log('✅ [addChallengeRules] AUTORIZACIÓN EXITOSA');
    
    // Validar reglas
    console.log('🔍 [addChallengeRules] Validando reglas...');
    if (!rules || !Array.isArray(rules) || rules.length === 0) {
      console.log('❌ [addChallengeRules] Reglas inválidas');
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere un array de reglas válido' 
      });
    }
    
    console.log('✅ [addChallengeRules] Reglas válidas, creando...');
    
    // Crear las reglas
    const createdRules = await ruleEvaluationService.createRulesForChallenge(challengeId, rules);
    
    console.log(`✅ [addChallengeRules] ÉXITO: ${createdRules.length} reglas creadas`);
    
    res.status(201).json({
      success: true,
      message: `${createdRules.length} reglas agregadas exitosamente`,
      data: createdRules
    });
    
  } catch (error) {
    console.error('❌ [addChallengeRules] ERROR GENERAL:', error);
    console.error('❌ [addChallengeRules] Stack trace:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor',
      error: error.message 
    });
  }
  
  console.log('🏁 [addChallengeRules] FIN - Función terminada');
};

// Crear una nueva competencia
exports.createChallenge = async (req, res) => {
  // LOG TEMPRANO PARA DEBUG
  console.log('🔴 [EARLY_DEBUG] === CREATECHALLENGE INICIADO ===');
  console.log('🔴 [EARLY_DEBUG] req.body completo:', JSON.stringify(req.body, null, 2));
  
  const transaction = await sequelize.transaction();
  try {
    const { 
      title, description, category, categoryId, startDate, endDate, 
      stake, createdBy, challenger, status, isPublic, imageUrl, rules 
    } = req.body;
    
    console.log('🖼️ [createChallenge] imageUrl recibida:', imageUrl);
    console.log('📋 [createChallenge] rules recibidas:', rules);
    console.log('📋 [createChallenge] tipo de rules:', typeof rules);
    console.log('📋 [createChallenge] es array rules:', Array.isArray(rules));
    console.log('📋 [createChallenge] longitud de rules:', rules?.length);
    
    // Obtener el ID del creador del token JWT o usar el proporcionado
    const creatorId = req.user?.id || createdBy;

    // Normalizar los datos de categoría
    let finalCategory = category;
    let finalCategoryId = categoryId;
    
    // Si se proporciona categoryId pero no category, buscar el nombre de la categoría
    if (categoryId && !category) {
      try {
        const { Category } = require('../models');
        const categoryRecord = await Category.findByPk(categoryId);
        if (categoryRecord) {
          finalCategory = categoryRecord.name;
        }
      } catch (err) {
        console.error('Error al buscar categoría por ID:', err);
      }
    }
    // Si se proporciona category pero no categoryId, buscar el ID de la categoría
    else if (category && !categoryId) {
      try {
        const { Category } = require('../models');
        const categoryRecord = await Category.findOne({
          where: { name: category }
        });
        if (categoryRecord) {
          finalCategoryId = categoryRecord.id;
        }
      } catch (err) {
        console.error('Error al buscar categoría por nombre:', err);
      }
    }

    // Crear la competencia
    const challenge = await Challenge.create({
      title,
      description,
      creatorId,
      category: finalCategory,
      categoryId: finalCategoryId,
      startDate,
      endDate,
      entryFee: stake, // Mapear stake a entryFee
      prize: stake * 2, // El premio es el doble de la apuesta
      status: status || 'pending',
      isPublic: isPublic !== undefined ? isPublic : true,
      challengerId: challenger, // Guardar el ID del retador directamente en la tabla challenges
      imageUrl: imageUrl // Guardar la URL de la imagen
    }, { transaction });
    
    console.log('✅ [createChallenge] Challenge creado con imageUrl:', challenge.imageUrl);
    
    // Obtener la información completa del retador para incluirla en la respuesta
    let challengerInfo = null;
    if (challenger) {
      challengerInfo = await User.findByPk(challenger, {
        attributes: ['id', 'username', 'email', 'profilePicture', 'fullName']
      }, { transaction });
    }

    // Crear un registro en la tabla Participant para el creador (siempre aceptado)
    await Participant.create({
      userId: creatorId,
      challengeId: challenge.id,
      status: 'accepted', // El creador siempre acepta su propio desafío
      role: 'creator' // Asignar el rol de creador
    }, { transaction });

    // Si se proporciona un retador (challenger), crear un registro en la tabla Participant
    if (challenger) {
      await Participant.create({
        userId: challenger,
        challengeId: challenge.id,
        status: 'pending',
        role: 'challenger' // Asignar el rol de retador
      }, { transaction });
    }

    // Otorgar puntos al usuario por crear un desafío
    await gamificationService.addPoints(
      creatorId, 
      10, 
      'Crear un desafío',
      {
        actionType: 'create_challenge',
        relatedEntityType: 'Challenge',
        relatedEntityId: challenge.id,
        metadata: {
          challengeTitle: title,
          category: finalCategory,
          stake: stake
        }
      }
    );
    
    // Verificar si es el primer desafío del usuario y otorgar insignia si corresponde
    const userChallengesCount = await Challenge.count({ where: { creatorId } });
    if (userChallengesCount === 1) {
      await gamificationService.awardBadge(creatorId, 'Primer Desafío');
    } else if (userChallengesCount === 5) {
      // Si ha creado 5 desafíos, otorgar insignia de Desafiante
      await gamificationService.awardBadge(creatorId, 'Desafiante');
    }
    
    // Obtener la información del creador antes de usarla
    const creator = await User.findByPk(creatorId, {
      attributes: ['id', 'username', 'email', 'profilePicture', 'fullName']
    });
    
    // Crear evento de timeline para el desafío creado
    await TimelineEvent.create({
      challengeId: challenge.id,
      type: 'challenge_created',
      description: `Desafío "${title}" creado por ${creator?.fullName || creator?.username || 'Usuario'} (${creator?.username || 'N/A'})`,
      userId: creatorId
    }, { transaction });

    console.log('📋 [createChallenge] === VERIFICANDO REGLAS ===');
    console.log('📋 [createChallenge] rules existe:', !!rules);
    console.log('📋 [createChallenge] rules es array:', Array.isArray(rules));
    console.log('📋 [createChallenge] rules length:', rules?.length);
    console.log('📋 [createChallenge] condición completa:', rules && Array.isArray(rules) && rules.length > 0);
    
    // 📋 Crear reglas del desafío si se proporcionaron
    if (rules && Array.isArray(rules) && rules.length > 0) {
      console.log(`📋 [createChallenge] === ENTRANDO A CREAR REGLAS ===`);
      console.log(`📋 [createChallenge] Creando ${rules.length} reglas para el desafío ${challenge.id}`);
      try {
        console.log(`📋 [createChallenge] Llamando a ruleEvaluationService.createRulesForChallenge...`);
        const createdRules = await ruleEvaluationService.createRulesForChallenge(
          challenge.id, 
          rules, 
          transaction
        );
        console.log(`✅ [createChallenge] ${createdRules.length} reglas creadas exitosamente`);
      } catch (ruleError) {
        console.error('❌ [createChallenge] Error al crear reglas:', ruleError);
        console.error('❌ [createChallenge] Stack trace:', ruleError.stack);
        throw ruleError; // Esto causará un rollback de la transacción
      }
    } else {
      console.log('ℹ️ [createChallenge] No se proporcionaron reglas para este desafío');
      console.log('ℹ️ [createChallenge] Razón: rules=', rules, ', esArray=', Array.isArray(rules), ', length=', rules?.length);
    }

    // Preparar la respuesta con la información completa
    const responseData = challenge.toJSON();
    if (creator) {
      responseData.creator = creator.toJSON();
    }
    
    // Incluir la información del retador si existe
    if (challengerInfo) {
      responseData.challenger = challengerInfo.toJSON();
      
      // Crear notificación para el retador
      try {
        await notificationController.createNotification(
          challenger,
          'challenge_received',
          `${creator?.fullName || creator?.username || 'Alguien'} te ha retado a un desafío: "${title}"`,
          challenge.id
        );
        console.log(`Notificación enviada al retador ${challenger} - nuevo desafío recibido`);
      } catch (notifError) {
        console.error('Error al crear notificación para el retador:', notifError);
        // No interrumpimos el flujo principal si falla la notificación
      }
    }

    // Confirmar la transacción solo al final si todo fue exitoso
    await transaction.commit();
    
    res.status(201).json({
      success: true,
      message: 'Desafío creado con éxito',
      data: responseData
    });
  } catch (error) {
    // Solo hacer rollback si la transacción no ha sido confirmada
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('Error al crear competencia:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating challenge', 
      error: error.message 
    });
  }
};

// Obtener todas las competencias (con filtros opcionales) - VERSIÓN OPTIMIZADA
exports.getChallenges = async (req, res) => {
  try {
    const { 
      page = 1, limit = 10, status, category, search,
      startDate, endDate, creatorId, userId, isPublic, includeChallenged = 'false'
    } = req.query;

    console.log(`🚀 [OPTIMIZADO] Procesando solicitud de desafíos para userId=${userId}, includeChallenged=${includeChallenged}`);

    // VERSIÓN OPTIMIZADA: Una sola consulta con JOINs
    if (userId) {
      try {
        console.log(`⚡ Ejecutando consulta optimizada para usuario ${userId}...`);
        const startTime = Date.now();
        
        // Paso 1: Obtener IDs de desafíos donde el usuario participa
        let participantChallengeIds = [];
        if (includeChallenged === 'true') {
          const participations = await Participant.findAll({
            where: { userId },
            attributes: ['challengeId']
          });
          participantChallengeIds = participations
            .map(p => p.challengeId)
            .filter(id => id !== null && id !== undefined);
        }
        
        // Paso 2: Construir condiciones WHERE para una sola consulta
        const whereConditions = {
          [Op.or]: [
            { creatorId: userId },
            { challengerId: userId },
            ...(participantChallengeIds.length > 0 ? [{ id: { [Op.in]: participantChallengeIds } }] : [])
          ]
        };
        
        // Paso 3: UNA SOLA CONSULTA con todos los JOINs necesarios
        const challenges = await Challenge.findAll({
          where: whereConditions,
          include: [
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'username', 'email', 'profilePicture', 'fullName'],
              required: false
            },
            {
              model: User,
              as: 'challengerUser',
              attributes: ['id', 'username', 'email', 'profilePicture', 'fullName'],
              required: false
            },
            {
              model: User,
              as: 'judgeUser',
              attributes: ['id', 'username', 'email', 'profilePicture', 'fullName'],
              required: false
            },
            {
              model: Category,
              as: 'categoryInfo',
              attributes: ['id', 'name', 'description'],
              required: false
            }
          ],
          order: [['createdAt', 'DESC']]
        });
        
        const endTime = Date.now();
        console.log(`⚡ Consulta optimizada completada en ${endTime - startTime}ms`);
        console.log(`📊 Total de desafíos encontrados: ${challenges.length}`);
        
        // Paso 4: Procesar y formatear los datos
        const formattedChallenges = challenges.map(challenge => {
          const challengeData = challenge.toJSON();
          
          // Mapear entryFee a stake para compatibilidad frontend
          challengeData.stake = challengeData.entryFee;
          
          // Formatear creador
          challengeData.createdBy = challengeData.creator || null;
          
          // Formatear retador
          challengeData.challenger = challengeData.challengerUser || { id: 'unknown', username: 'Sin retador' };
          
          // Formatear juez
          challengeData.judge = challengeData.judgeUser || null;
          
          // Procesar información de categoría
          if (challengeData.categoryInfo) {
            challengeData.categoryName = challengeData.categoryInfo.name;
            challengeData.categoryDescription = challengeData.categoryInfo.description;
            challengeData.categoryId = challengeData.category;
            challengeData.category = challengeData.categoryInfo.name;
          } else {
            challengeData.categoryName = challengeData.category || 'Sin categoría';
            challengeData.category = challengeData.category || 'Sin categoría';
          }
          
          // Limpiar campos innecesarios
          delete challengeData.creator;
          delete challengeData.challengerUser;
          delete challengeData.judgeUser;
          delete challengeData.categoryInfo;
          
          return challengeData;
        });
        
        console.log(`✅ Procesamiento completado. Enviando ${formattedChallenges.length} desafíos`);
        
        return res.status(200).json({
          success: true,
          data: formattedChallenges,
          count: formattedChallenges.length,
          message: `Desafíos obtenidos exitosamente en ${endTime - startTime}ms`
        });
        
      } catch (error) {
        console.error('❌ Error en consulta optimizada:', error);
        // Fallback a la versión anterior si hay error
        console.log('🔄 Intentando con método de fallback...');
        
        // Versión simplificada de fallback
        const creatorChallenges = await Challenge.findAll({
          where: { creatorId: userId },
          order: [['createdAt', 'DESC']]
        });
        
        const challengerChallenges = await Challenge.findAll({
          where: { challengerId: userId },
          order: [['createdAt', 'DESC']]
        });
        
        const allChallenges = [...creatorChallenges, ...challengerChallenges];
        const uniqueChallenges = allChallenges.filter((challenge, index, self) => 
          index === self.findIndex(c => c.id === challenge.id)
        );
        
        const simplifiedChallenges = uniqueChallenges.map(challenge => {
          const challengeData = challenge.toJSON();
          challengeData.stake = challengeData.entryFee;
          challengeData.createdBy = { id: challenge.creatorId, username: 'Usuario' };
          challengeData.challenger = { id: challenge.challengerId || 'unknown', username: 'Sin retador' };
          challengeData.category = challengeData.category || 'Sin categoría';
          return challengeData;
        });
        
        return res.status(200).json({
          success: true,
          data: simplifiedChallenges,
          count: simplifiedChallenges.length,
          message: 'Desafíos obtenidos con método de fallback'
        });
      }
    }
    
    // Si no se proporciona userId, realizar una búsqueda normal
    const offset = (page - 1) * limit;
    const searchConditions = {};
    
    if (status) searchConditions.status = status;
    // Filtrar por categoría - buscar tanto por nombre como por ID
    if (category) {
      // Si es un UUID, filtrar por categoryId, sino por category name
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
      if (isUUID) {
        searchConditions.categoryId = category;
      } else {
        searchConditions[Op.or] = [
          { category: category },
          { category: { [Op.iLike]: `%${category}%` } }
        ];
      }
    }
    if (creatorId) searchConditions.creatorId = creatorId;
    
    // VERSIÓN OPTIMIZADA: Una sola consulta con JOINs para desafíos públicos
    console.log(`⚡ [PÚBLICO] Ejecutando consulta optimizada para desafíos públicos...`);
    const startTime = Date.now();
    
    const { count, rows } = await Challenge.findAndCountAll({
      where: searchConditions,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email', 'profilePicture', 'fullName'],
          required: false
        },
        {
          model: User,
          as: 'challengerUser',
          attributes: ['id', 'username', 'email', 'profilePicture', 'fullName'],
          required: false
        },
        {
          model: User,
          as: 'judgeUser',
          attributes: ['id', 'username', 'email', 'profilePicture', 'fullName'],
          required: false
        },
        {
          model: Category,
          as: 'categoryInfo',
          attributes: ['id', 'name', 'description'],
          required: false
        }
      ]
    });
    
    const endTime = Date.now();
    console.log(`⚡ [PÚBLICO] Consulta completada en ${endTime - startTime}ms`);
    console.log(`📊 [PÚBLICO] Total de desafíos encontrados: ${rows.length}`);
    
    // Procesar y formatear los datos (sin consultas adicionales)
    const challenges = rows.map(challenge => {
      const challengeData = challenge.toJSON();
      
      // Mapear entryFee a stake para compatibilidad frontend
      challengeData.stake = challengeData.entryFee;
      
      // Formatear creador - preservar datos reales
      challengeData.createdBy = challengeData.creator || null;
      
      // Formatear retador - preservar datos reales
      challengeData.challenger = challengeData.challengerUser || null;
      
      // Formatear juez - preservar datos reales
      challengeData.judge = challengeData.judgeUser || null;
      
      // Procesar información de categoría
      if (challengeData.categoryInfo) {
        challengeData.categoryName = challengeData.categoryInfo.name;
        challengeData.categoryDescription = challengeData.categoryInfo.description;
        challengeData.categoryId = challengeData.category;
        challengeData.category = challengeData.categoryInfo.name;
      } else {
        challengeData.categoryName = challengeData.category || 'Sin categoría';
        challengeData.category = challengeData.category || 'Sin categoría';
      }
      
      // Limpiar campos innecesarios
      delete challengeData.creator;
      delete challengeData.challengerUser;
      delete challengeData.judgeUser;
      delete challengeData.categoryInfo;
      
      return challengeData;
    });
    
    return res.status(200).json({
      success: true,
      count: challenges.length,
      data: challenges
    });
  } catch (error) {
    console.error('Error al obtener competencias:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching challenges', 
      error: error.message 
    });
  }
};

// Obtener una competencia por ID
exports.getChallengeById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    console.log(`Obteniendo desafío con ID: ${id}, usuario: ${userId || 'no autenticado'}`);
    
    // Verificar que el ID sea válido
    if (!id) {
      console.log('ID de desafío no proporcionado');
      return res.status(400).json({
        success: false,
        message: 'Se requiere un ID de desafío válido'
      });
    }
    
    try {
      // Buscar el desafío con sus relaciones
      const challenge = await Challenge.findByPk(id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'email', 'profilePicture', 'fullName'],
            required: false // Hacer que la relación sea opcional
          },
          {
            model: User,
            as: 'challengerUser',
            attributes: ['id', 'username', 'email', 'profilePicture', 'fullName'],
            required: false // Hacer que la relación sea opcional
          },
          {
            model: User,
            as: 'judgeUser',
            attributes: ['id', 'username', 'email', 'profilePicture', 'fullName'],
            required: false // Hacer que la relación sea opcional
          },
          {
            model: Participant,
            as: 'participants',
            required: false, // Hacer que la relación sea opcional
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'email', 'profilePicture', 'fullName'],
                required: false // Hacer que la relación sea opcional
              }
            ]
          },
          {
            model: Comment,
            as: 'comments',
            required: false, // Hacer que la relación sea opcional
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'profilePicture', 'fullName'],
                required: false // Hacer que la relación sea opcional
              }
            ]
          },
          {
            model: Category,
            as: 'categoryInfo',
            attributes: ['id', 'name', 'description'],
            required: false // LEFT JOIN para manejar casos sin categoría
          },
          {
            model: Rule,
            as: 'challengeRules',
            attributes: ['id', 'description', 'orderIndex', 'isMandatory'],
            required: false // LEFT JOIN para manejar casos sin reglas
          }
        ]
      });
      
      console.log(`Resultado de búsqueda para desafío ${id}: ${challenge ? 'Encontrado' : 'No encontrado'}`);
      
      if (!challenge) {
        return res.status(404).json({ 
          success: false, 
          message: 'Challenge not found' 
        });
      }

      try {
        console.log(`🔄 [getChallengeById] Procesando datos del desafío ${id}`);
        console.log(`🔍 [getChallengeById] Estructura del challenge raw:`, JSON.stringify(challenge, null, 2));
        
        // Convertir a JSON y añadir el campo stake mapeado desde entryFee
        console.log(`🔄 [getChallengeById] Convirtiendo challenge a JSON...`);
        const challengeJSON = challenge.toJSON();
        console.log(`🔍 [getChallengeById] Challenge JSON inicial:`, JSON.stringify(challengeJSON, null, 2));
        
        console.log(`🔄 [getChallengeById] Mapeando stake desde entryFee...`);
        challengeJSON.stake = challengeJSON.entryFee || 0;
        console.log(`💰 [getChallengeById] Stake mapeado: ${challengeJSON.stake}`);
        
        console.log(`🔄 [getChallengeById] Verificando creador...`);
        console.log(`👤 [getChallengeById] Creator data:`, JSON.stringify(challengeJSON.creator, null, 2));
        
        // Manejar el caso donde el creador no existe
        if (!challengeJSON.creator) {
          console.warn(`Advertencia: El desafío ${id} no tiene creador definido, usando valores por defecto`);
          challengeJSON.creator = {
            id: 'unknown',
            username: 'Usuario desconocido',
            fullName: 'Usuario desconocido',
            profilePicture: '?'
          };
        }
        
        // Formatear la información del creador
        console.log(`🔄 [getChallengeById] Formateando información del creador: ${challengeJSON.creator.id}`);
        challengeJSON.createdBy = {
          id: challengeJSON.creator.id,
          name: challengeJSON.creator.fullName || challengeJSON.creator.username || 'Usuario',
          avatar: (challengeJSON.creator.profilePicture || challengeJSON.creator.username || 'U').charAt(0)
        };
        console.log(`👤 [getChallengeById] CreatedBy formateado:`, JSON.stringify(challengeJSON.createdBy, null, 2));

        // Verificar que participants existe y es un array
        console.log(`🔄 [getChallengeById] Verificando participantes...`);
        console.log(`👥 [getChallengeById] Participants data:`, JSON.stringify(challengeJSON.participants, null, 2));
        
        if (!challengeJSON.participants || !Array.isArray(challengeJSON.participants)) {
          console.warn(`⚠️ [getChallengeById] Advertencia: El desafío ${id} no tiene participantes definidos o no es un array, inicializando array vacío`);
          challengeJSON.participants = [];
        }
        
        // Prioridad 1: Usar el challengerId si existe y obtener la información completa del usuario
        console.log(`🔄 [getChallengeById] Procesando challenger...`);
        console.log(`🎯 [getChallengeById] ChallengerId: ${challengeJSON.challengerId}`);
        
        if (challengeJSON.challengerId) {
          console.log(`🔍 [getChallengeById] Usando challengerId ${challengeJSON.challengerId} para obtener información del retador`);
          
          try {
            const retador = await User.findByPk(challengeJSON.challengerId, {
              attributes: ['id', 'username', 'email', 'profilePicture', 'fullName']
            });
            
            if (retador) {
              console.log(`Retador encontrado por ID: ${retador.username}`);
              challengeJSON.challenger = retador.toJSON();
              
              // Buscar el estado del participante
              const participante = challengeJSON.participants.find(p => p.userId === retador.id);
              if (participante) {
                challengeJSON.challenger.status = participante.status || 'pending';
              }
            } else {
              console.warn(`No se encontró usuario con ID ${challengeJSON.challengerId}`);
            }
          } catch (error) {
            console.error(`Error al buscar retador por ID: ${error.message}`);
          }
        }
        
        // Prioridad 2: Si no hay challengerId o no se encontró el usuario, buscar en participantes
        if (!challengeJSON.challenger || !challengeJSON.challenger.username) {
          console.log(`Buscando retador entre ${challengeJSON.participants.length} participantes`);
          
          // Buscar participante con rol 'challenger' o que no sea el creador
          const challenger = challengeJSON.participants.find(p => 
            (p.role === 'challenger') || 
            (p.userId !== challengeJSON.creator.id && p.userId !== challengeJSON.creatorId)
          );
          
          if (challenger) {
            console.log(`Participante retador encontrado: ${challenger.userId}`);
            
            // Si el participante tiene información de usuario completa
            if (challenger.user && (challenger.user.username || challenger.user.fullName)) {
              console.log(`Retador tiene información completa: ${challenger.user.username || challenger.user.fullName}`);
              challengeJSON.challenger = challenger.user;
              challengeJSON.challenger.status = challenger.status || 'pending';
              
              // Actualizar el challengerId en la base de datos para futuras consultas
              if (!challengeJSON.challengerId) {
                console.log(`Actualizando challengerId a ${challenger.userId} en la base de datos`);
                await Challenge.update(
                  { challengerId: challenger.userId },
                  { where: { id: challengeJSON.id } }
                );
                challengeJSON.challengerId = challenger.userId;
              }
              
              // Actualizar el rol del participante si no está definido
              if (!challenger.role) {
                console.log(`Actualizando rol del participante ${challenger.userId} a 'challenger'`);
                await Participant.update(
                  { role: 'challenger' },
                  { where: { challengeId: challengeJSON.id, userId: challenger.userId } }
                );
              }
            } 
            // Si el participante no tiene información de usuario, buscarla en la base de datos
            else if (challenger.userId) {
              try {
                console.log(`Buscando información completa del usuario ${challenger.userId}`);
                const retador = await User.findByPk(challenger.userId, {
                  attributes: ['id', 'username', 'email', 'profilePicture', 'fullName']
                });
                
                if (retador) {
                  console.log(`Información del retador encontrada: ${retador.username}`);
                  challengeJSON.challenger = retador.toJSON();
                  challengeJSON.challenger.status = challenger.status || 'pending';
                  
                  // Actualizar el challengerId en la base de datos
                  if (!challengeJSON.challengerId) {
                    console.log(`Actualizando challengerId a ${retador.id} en la base de datos`);
                    await Challenge.update(
                      { challengerId: retador.id },
                      { where: { id: challengeJSON.id } }
                    );
                    challengeJSON.challengerId = retador.id;
                  }
                }
              } catch (error) {
                console.error(`Error al buscar información del retador: ${error.message}`);
              }
            }
          }
        }
        
        // Si aún no tenemos información del retador, usar valores por defecto
        if (!challengeJSON.challenger || (!challengeJSON.challenger.username && !challengeJSON.challenger.fullName)) {
          console.log('No se encontró información del retador, usando valores por defecto');
          challengeJSON.challenger = {
            id: challengeJSON.challengerId || '',
            username: 'Sin retador',
            fullName: 'Sin retador',
            profilePicture: '?',
            status: 'pending'
          };
        }

        // Procesar información del juez si existe
        console.log(`🎨 [getChallengeById] Procesando juez...`);
        console.log(`👨‍⚖️ [getChallengeById] JudgeId: ${challengeJSON.judgeId}`);
        console.log(`👨‍⚖️ [getChallengeById] JudgeUser data:`, JSON.stringify(challengeJSON.judgeUser, null, 2));
        
        if (challengeJSON.judgeId && challengeJSON.judgeUser) {
          console.log(`⚖️ [getChallengeById] Formateando información del juez: ${challengeJSON.judgeUser.username || challengeJSON.judgeUser.fullName}`);
          challengeJSON.judge = {
            id: challengeJSON.judgeUser.id,
            name: challengeJSON.judgeUser.fullName || challengeJSON.judgeUser.username || 'Juez',
            fullName: challengeJSON.judgeUser.fullName,
            username: challengeJSON.judgeUser.username,
            avatar: (challengeJSON.judgeUser.profilePicture || challengeJSON.judgeUser.username || 'J').charAt(0)
          };
          console.log(`⚖️ [getChallengeById] Judge formateado:`, JSON.stringify(challengeJSON.judge, null, 2));
        } else if (challengeJSON.judgeId) {
          console.log(`⚠️ [getChallengeById] Hay judgeId pero no judgeUser, buscando información del juez...`);
          try {
            const juez = await User.findByPk(challengeJSON.judgeId, {
              attributes: ['id', 'username', 'email', 'profilePicture', 'fullName']
            });
            
            if (juez) {
              console.log(`⚖️ [getChallengeById] Juez encontrado por ID: ${juez.username || juez.fullName}`);
              challengeJSON.judge = {
                id: juez.id,
                name: juez.fullName || juez.username || 'Juez',
                fullName: juez.fullName,
                username: juez.username,
                avatar: (juez.profilePicture || juez.username || 'J').charAt(0)
              };
            } else {
              console.warn(`⚠️ [getChallengeById] No se encontró usuario juez con ID ${challengeJSON.judgeId}`);
            }
          } catch (error) {
            console.error(`❌ [getChallengeById] Error al buscar juez por ID: ${error.message}`);
          }
        }

        // Si el usuario actual es un participante, añadir su estado de participación
        if (userId) {
          console.log(`Verificando si el usuario ${userId} es participante`);
          const userParticipant = challengeJSON.participants.find(p => p.userId === userId);
          if (userParticipant) {
            console.log(`Usuario ${userId} es participante con estado: ${userParticipant.status}`);
            challengeJSON.userParticipantStatus = userParticipant.status || 'pending';
          }
        }
        
        // Obtener eventos de timeline manualmente para evitar problemas con includes
        console.log(`🔄 [getChallengeById] Obteniendo eventos de timeline para desafío ${id}...`);
        try {
          const timelineEvents = await TimelineEvent.findAll({
            where: { challengeId: id },
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'fullName', 'profilePicture'],
              required: false // LEFT JOIN para eventos sin usuario asociado
            }],
            order: [['timestamp', 'DESC']] // Más recientes primero
          });
          
          console.log(`📅 [getChallengeById] Eventos de timeline encontrados: ${timelineEvents.length}`);
          
          if (timelineEvents && timelineEvents.length > 0) {
            challengeJSON.timeline = timelineEvents.map(event => ({
              id: event.id,
              type: event.type,
              description: event.description,
              timestamp: event.timestamp,
              userId: event.userId,
              userName: event.user ? event.user.fullName : null,
              userUsername: event.user ? event.user.username : null,
              userAvatar: event.user ? event.user.profilePicture : null
            }));
            console.log(`📅 [getChallengeById] Timeline procesado con ${challengeJSON.timeline.length} eventos`);
          } else {
            challengeJSON.timeline = [];
            console.log(`📅 [getChallengeById] No se encontraron eventos de timeline`);
          }
        } catch (timelineError) {
          console.error(`❌ [getChallengeById] Error al obtener timeline: ${timelineError.message}`);
          challengeJSON.timeline = [];
        }
        
        // Asegurarse de que todos los campos requeridos estén presentes
        challengeJSON.title = challengeJSON.title || 'Desafío sin título';
        challengeJSON.description = challengeJSON.description || 'Sin descripción';
        challengeJSON.category = challengeJSON.category || 'general';
        challengeJSON.status = challengeJSON.status || 'pending';
        challengeJSON.startDate = challengeJSON.startDate || new Date().toISOString();
        challengeJSON.endDate = challengeJSON.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        // Procesar reglas si existen
        if (challengeJSON.challengeRules && Array.isArray(challengeJSON.challengeRules)) {
          // Ordenar reglas por orderIndex y mapear a 'rules' para el frontend
          challengeJSON.rules = challengeJSON.challengeRules
            .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
            .map(rule => ({
              id: rule.id,
              description: rule.description,
              orderIndex: rule.orderIndex || 0,
              isMandatory: rule.isMandatory || false
            }));
          console.log(`📝 [getChallengeById] Reglas procesadas: ${challengeJSON.rules.length}`);
          // Limpiar challengeRules ya que usamos rules
          delete challengeJSON.challengeRules;
        } else {
          challengeJSON.rules = [];
          console.log(`📝 [getChallengeById] No se encontraron reglas para el desafío`);
        }
        challengeJSON.evidence = challengeJSON.evidence || [];
        challengeJSON.comments = challengeJSON.comments || [];
        challengeJSON.isPublic = challengeJSON.isPublic !== undefined ? challengeJSON.isPublic : true;
        
        // Procesar información de categoría
        if (challengeJSON.categoryInfo) {
          // Si tenemos información de categoría del JOIN, usar el nombre
          challengeJSON.categoryName = challengeJSON.categoryInfo.name;
          challengeJSON.categoryDescription = challengeJSON.categoryInfo.description;
          // Mantener el UUID en category para compatibilidad
          challengeJSON.categoryId = challengeJSON.categoryInfo.id;
        } else if (challengeJSON.category) {
          // Si no hay JOIN pero tenemos UUID en category, intentar obtener el nombre
          try {
            const categoryRecord = await Category.findByPk(challengeJSON.category);
            if (categoryRecord) {
              challengeJSON.categoryName = categoryRecord.name;
              challengeJSON.categoryDescription = categoryRecord.description;
              challengeJSON.categoryId = challengeJSON.category; // Guardar UUID original
              challengeJSON.category = categoryRecord.name; // Reemplazar UUID con nombre
            } else {
              challengeJSON.categoryName = 'Categoría desconocida';
              challengeJSON.category = 'Categoría desconocida'; // Para compatibilidad frontend
            }
          } catch (err) {
            console.error('Error al obtener categoría:', err);
            challengeJSON.categoryName = 'Categoría desconocida';
            challengeJSON.category = 'Categoría desconocida'; // Para compatibilidad frontend
          }
        } else {
          challengeJSON.categoryName = 'Sin categoría';
          challengeJSON.category = 'Sin categoría'; // Para compatibilidad frontend
        }
        
        console.log(`Procesamiento de datos del desafío ${id} completado con éxito`);
        
        // Enviar la respuesta con los datos procesados
        return res.status(200).json({
          success: true,
          data: challengeJSON
        });
        
      } catch (processingError) {
        console.error(`❌ [getChallengeById] ERROR CRÍTICO al procesar datos del desafío ${id}:`);
        console.error(`❌ [getChallengeById] Error message:`, processingError.message);
        console.error(`❌ [getChallengeById] Error stack:`, processingError.stack);
        console.error(`❌ [getChallengeById] Error completo:`, processingError);
        
        // Crear un objeto de desafío mínimo para devolver en caso de error
        const minimalChallenge = {
          id: id,
          title: 'Desafío',
          description: 'Hubo un problema al cargar los detalles completos de este desafío.',
          status: challenge.status || 'pending',
          createdBy: { id: '', name: 'Creador', avatar: 'C' },
          challenger: { id: '', name: 'Retador', avatar: 'R' },
          stake: challenge.entryFee || 0,
          startDate: challenge.startDate || new Date().toISOString(),
          endDate: challenge.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          rules: [],
          evidence: [],
          comments: [],
          isPublic: true
        };
        
        // Devolver datos mínimos en lugar de error 500
        return res.status(200).json({
          success: true,
          message: 'Datos parciales del desafío debido a un error de procesamiento',
          data: minimalChallenge,
          processingError: processingError.message
        });
      }
    } catch (dbError) {
      console.error(`Error de base de datos al obtener desafío ${id}:`, dbError);
      
      // Crear un objeto de desafío mínimo para devolver en caso de error
      const fallbackChallenge = {
        id: id,
        title: 'Desafío',
        description: 'No se pudieron cargar los detalles del desafío.',
        status: 'pending',
        createdBy: { id: '', name: 'Creador', avatar: 'C' },
        challenger: { id: '', name: 'Retador', avatar: 'R' },
        stake: 0,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        rules: [],
        evidence: [],
        comments: [],
        isPublic: true
      };
      
      // Devolver datos mínimos en lugar de error 500
      return res.status(200).json({
        success: true,
        message: 'Datos de fallback debido a un error de base de datos',
        data: fallbackChallenge,
        dbError: dbError.message
      });
    }
  } catch (error) {
    console.error('Error general al obtener competencia por ID:', error);
    
    // Crear un objeto de desafío mínimo para devolver en caso de error
    const emergencyChallenge = {
      id: id || 'unknown',
      title: 'Desafío',
      description: 'Error al cargar los detalles del desafío.',
      status: 'pending',
      createdBy: { id: '', name: 'Creador', avatar: 'C' },
      challenger: { id: '', name: 'Retador', avatar: 'R' },
      stake: 0,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      rules: [],
      evidence: [],
      comments: [],
      isPublic: true
    };
    
    // Devolver datos mínimos en lugar de error 500
    return res.status(200).json({
      success: true,
      message: 'Datos de emergencia debido a un error general',
      data: emergencyChallenge,
      error: error.message
    });
  }
};

// Actualizar una competencia
exports.updateChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // Obtenido del middleware de autenticación
    
    const { 
      title, description, category, startDate, endDate, 
      stake, status, isPublic 
    } = req.body;

    const challenge = await Challenge.findByPk(id);

    if (!challenge) {
      return res.status(404).json({ 
        success: false, 
        message: 'Challenge not found' 
      });
    }

    // Verificar que el usuario sea el creador de la competencia
    if (challenge.creatorId !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to update this challenge' 
      });
    }

    // Actualizar campos
    if (title) challenge.title = title;
    if (description) challenge.description = description;
    if (category) challenge.category = category;
    if (startDate) challenge.startDate = startDate;
    if (endDate) challenge.endDate = endDate;
    if (stake !== undefined) challenge.entryFee = stake; // Mapear stake a entryFee
    if (status) challenge.status = status;
    if (isPublic !== undefined) challenge.isPublic = isPublic;

    await challenge.save();

    res.status(200).json({
      success: true,
      message: 'Challenge updated successfully',
      data: challenge
    });
  } catch (error) {
    console.error('Error al actualizar competencia:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating challenge', 
      error: error.message 
    });
  }
};

// Unirse a una competencia
exports.joinChallenge = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const userId = req.user.id; // Obtenido del middleware de autenticación
    const { invitationCode } = req.body;

    const challenge = await Challenge.findByPk(id, { transaction });

    if (!challenge) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Challenge not found' 
      });
    }

    // Verificar si la competencia es privada y requiere código de invitación
    if (challenge.isPublic === false && challenge.invitationCode !== invitationCode) {
      await transaction.rollback();
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid invitation code' 
      });
    }

    // Verificar si el usuario ya es participante
    const existingParticipant = await Participant.findOne({
      where: { 
        userId, 
        challengeId: id
      },
      transaction
    });

    if (existingParticipant) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'You are already a participant in this challenge' 
      });
    }

    // Verificar si la competencia está llena
    const participantCount = await Participant.count({
      where: { 
        challengeId: id, 
        status: 'accepted'
      },
      transaction
    });

    if (participantCount >= challenge.maxParticipants) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'The challenge is already full' 
      });
    }

    // Crear participante
    const participant = await Participant.create({
      userId,
      challengeId: id,
      status: 'pending',
      paymentStatus: 'pending'
    }, { transaction });

    // Obtener información del usuario para el timeline
    const user = await User.findByPk(userId, {
      attributes: ['fullName', 'username']
    }, { transaction });

    // Crear evento de timeline para la participación
    await TimelineEvent.create({
      challengeId: id,
      type: 'challenge_accepted',
      description: `${user?.fullName || user?.username || 'Usuario'} (${user?.username || 'N/A'}) se unió al desafío`,
      userId: userId
    }, { transaction });

    // Crear notificación para el creador del desafío
    try {
      await notificationController.createNotification(
        challenge.creatorId,
        'challenge_joined',
        `${user?.fullName || user?.username || 'Alguien'} se ha unido a tu desafío: "${challenge.title}"`,
        id
      );
      console.log(`Notificación enviada al creador ${challenge.creatorId} - nuevo participante`);
    } catch (notifError) {
      console.error('Error al crear notificación para el creador:', notifError);
      // No interrumpimos el flujo principal si falla la notificación
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'You have joined the challenge successfully',
      data: participant
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al unirse a la competencia:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error joining challenge', 
      error: error.message 
    });
  }
};

// Determinar ganador de una competencia
exports.determineWinner = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const userId = req.user.id; // Obtenido del middleware de autenticación
    const { winnerId } = req.body;

    const challenge = await Challenge.findByPk(id, { transaction });

    if (!challenge) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Challenge not found' 
      });
    }

    // Verificar que el usuario sea el creador de la competencia
    if (challenge.creatorId !== userId) {
      await transaction.rollback();
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to determine the winner' 
      });
    }

    // Verificar que la competencia esté en un estado válido para determinar ganador
    const validStatusesForWinner = ['in_progress', 'judging', 'completed'];
    if (!validStatusesForWinner.includes(challenge.status)) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Only challenges in progress, judging, or completed can have a winner determined' 
      });
    }

    // Verificar que el ganador sea un participante válido
    const winnerParticipant = await Participant.findOne({
      where: { 
        userId: winnerId, 
        challengeId: id,
        status: 'accepted'
      },
      transaction
    });

    if (!winnerParticipant) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'The selected winner is not a valid participant' 
      });
    }

    // Actualizar el estado del ganador
    winnerParticipant.isWinner = true;
    winnerParticipant.result = 'win';
    await winnerParticipant.save({ transaction });

    // Actualizar el estado de los demás participantes
    await Participant.update(
      { result: 'lose' },
      { 
        where: { 
          challengeId: id, 
          userId: { [Op.ne]: winnerId },
          status: 'accepted'
        },
        transaction 
      }
    );

    // Actualizar el estado de la competencia
    challenge.status = 'completed';
    challenge.winnerDetermined = true;
    await challenge.save({ transaction });
    
    // Otorgar puntos a todos los participantes por completar el desafío
    const participants = await Participant.findAll({
      where: { challengeId: id, status: 'accepted' },
      transaction
    });
    
    for (const participant of participants) {
      // Todos los participantes reciben puntos por completar un desafío
      await gamificationService.addPoints(
        participant.userId, 
        20, 
        'Completar un desafío',
        {
          actionType: 'complete_challenge',
          relatedEntityType: 'Challenge',
          relatedEntityId: challengeId,
          metadata: {
            challengeTitle: challenge.title,
            participantRole: 'participant'
          }
        }
      );
      
      // El ganador recibe puntos adicionales
      if (participant.userId === winnerId) {
        await gamificationService.addPoints(
          participant.userId, 
          30, 
          'Ganar un desafío',
          {
            actionType: 'win_challenge',
            relatedEntityType: 'Challenge',
            relatedEntityId: challengeId,
            metadata: {
              challengeTitle: challenge.title,
              participantRole: 'winner'
            }
          }
        );
        
        // Contar cuántos desafíos ha ganado el usuario
        const winCount = await Participant.count({
          where: { 
            userId: participant.userId,
            isWinner: true
          }
        });
        
        // Si ha ganado 10 desafíos, otorgar insignia de Campeón
        if (winCount === 10) {
          await gamificationService.awardBadge(participant.userId, 'Campeón');
        }
      }
    }
    
    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Winner determined successfully',
      data: {
        challengeId: id,
        winnerId
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al determinar ganador:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error determining winner', 
      error: error.message 
    });
  }
};

// Aceptar un desafío
exports.acceptChallenge = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const transaction = await sequelize.transaction();

  try {
    console.log(`Usuario ${userId} intentando aceptar desafío ${id}`);

    // Buscar el desafío
    const challenge = await Challenge.findByPk(id, { transaction });

    if (!challenge) {
      await transaction.rollback();
      console.log('Desafío no encontrado');
      return res.status(404).json({
        success: false,
        message: 'Desafío no encontrado'
      });
    }
    console.log('Desafío encontrado:', JSON.stringify(challenge));

    // Verificar que el usuario que intenta aceptar no es el creador
    if (userId === challenge.creatorId) {
      await transaction.rollback();
      console.log('El creador del desafío no puede aceptarlo');
      return res.status(403).json({
        success: false,
        message: 'Como creador del desafío, no puedes aceptarlo. Solo el retador puede aceptar el desafío.'
      });
    }
    
    // Buscar a todos los participantes del desafío
    const participants = await Participant.findAll({
      where: { challengeId: id },
      transaction
    });
    
    // Verificar si el usuario es un participante que no es el creador
    const isChallenger = participants.some(p => 
      p.userId === userId && challenge.creatorId !== userId
    );
    
    if (!isChallenger) {
      await transaction.rollback();
      console.log('El usuario no es el retador del desafío');
      return res.status(403).json({
        success: false,
        message: 'Solo el usuario retado puede aceptar este desafío'
      });
    }

    // Buscar el registro de participante para el usuario actual
    let participant = await Participant.findOne({
      where: {
        challengeId: id,
        userId: userId
      },
      transaction
    });

    console.log('Participante encontrado:', JSON.stringify(participant));

    // Si no existe el registro de participante (lo cual es extraño en este punto), crearlo
    if (!participant) {
      console.log('Creando registro de participante para el retador');
      participant = await Participant.create({
        userId: userId,
        challengeId: id,
        status: 'pending'
      }, { transaction });
    }

    // Actualizar el estado del participante a 'accepted'
    await participant.update({ status: 'accepted' }, { transaction });
    console.log('Estado del participante actualizado a accepted');

    // Si ambos participantes han aceptado, actualizar el estado del desafío a 'accepted'
    const allParticipants = await Participant.findAll({
      where: { challengeId: id },
      transaction
    });

    console.log('Todos los participantes:', JSON.stringify(allParticipants));

    // Verificar si hay al menos 2 participantes y todos han aceptado
    const allAccepted = allParticipants.length >= 2 && allParticipants.every(p => p.status === 'accepted');
    
    // IMPORTANTE: Solo actualizar a 'accepted' si el estado actual es 'pending'
    // Esto evita que un desafío que ya está en progreso vuelva a estados anteriores
    if (allAccepted && challenge.status === 'pending') {
      // FLUJO CORRECTO: Actualizar el estado a 'accepted' cuando todos los participantes aceptan
      await challenge.update({ 
        status: 'accepted'
        // NO asignamos judgeId aquí - eso se hace cuando el creador asigna un juez
      }, { transaction });
      
      console.log('Estado del desafío actualizado a accepted - todos los participantes han aceptado');
      
      // Agregar un evento a la línea de tiempo para indicar que el desafío ha sido aceptado
      await TimelineEvent.create({
        challengeId: id,
        type: 'challenge_accepted',
        timestamp: new Date(),
        description: 'El desafío ha sido aceptado por todos los participantes. El creador debe asignar un juez.',
        userId: userId
      }, { transaction });
      
      // Crear una notificación para el creador del desafío
      try {
        await notificationController.createNotification(
          challenge.creatorId,
          'challenge_accepted',
          `Tu desafío "${challenge.title}" ha sido aceptado por todos los participantes. Ahora debes asignar un juez.`,
          id
        );
        console.log(`Notificación enviada al creador ${challenge.creatorId} - desafío aceptado, debe asignar juez`);
      } catch (notifError) {
        console.error('Error al crear notificación de desafío aceptado:', notifError);
        // No interrumpimos el flujo principal si falla la notificación
      }
      
    } else if (challenge.status === 'pending') {
      // Si no todos han aceptado pero este participante sí, mantener en 'pending'
      console.log('Manteniendo estado del desafío como pending hasta que todos acepten');
    } else {
      console.log(`Manteniendo el estado actual del desafío: ${challenge.status}`);
    }

    // Otorgar puntos al usuario por aceptar un desafío
    await gamificationService.addPoints(
      userId, 
      5, 
      'Aceptar un desafío',
      {
        actionType: 'accept_challenge',
        relatedEntityType: 'Challenge',
        relatedEntityId: id,
        metadata: {
          challengeTitle: challenge.title,
          challengeStatus: challenge.status
        }
      }
    );
    
    // Si es el primer desafío que acepta, verificar si hay más participaciones
    const userParticipationsCount = await Participant.count({ 
      where: { userId, status: 'accepted' }
    });
    
    // Si ha participado en 5 desafíos, otorgar insignia
    if (userParticipationsCount === 5) {
      await gamificationService.awardBadge(userId, 'Participante Activo', 'Has participado en 5 desafíos', 'challenges');
    }
    
    await transaction.commit();
    console.log('Transacción completada con éxito');

    try {
      // Obtener el desafío actualizado para devolverlo en la respuesta
      const updatedChallenge = await Challenge.findByPk(id, {
        include: [
          { model: User, as: 'creator' },
          { model: Participant, include: [{ model: User, as: 'user' }] }
        ]
      });

      // Guardar datos completos para uso en caso de error en frontend
      const challengeData = updatedChallenge ? updatedChallenge.toJSON() : {
        id: id,
        status: allAccepted && challenge.status === 'pending' ? 'judge_assigned' : challenge.status,
        participantStatus: 'accepted'
      };

      // Devolver una respuesta más detallada
      return res.status(200).json({
        success: true,
        message: 'Desafío aceptado con éxito',
        data: challengeData
      });
    } catch (error) {
      console.error('Error al obtener el desafío actualizado:', error);
      // No hacemos rollback aquí porque la transacción principal ya fue confirmada
      return res.status(200).json({
        success: true,
        message: 'Desafío aceptado con éxito, pero hubo un error al obtener los detalles actualizados',
        data: {
          challengeId: id,
          status: allAccepted && challenge.status === 'pending' ? 'judge_assigned' : challenge.status,
          participantStatus: 'accepted'
        }
      });
    }
  } catch (error) {
    // Solo hacemos rollback si la transacción no ha sido confirmada
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('Error al aceptar el desafío:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al aceptar el desafío',
      error: error.message
    });
  }
};

// Rechazar un desafío
exports.rejectChallenge = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`Usuario ${userId} intentando rechazar el desafío ${id}`);

    // Verificar que el desafío existe
    const challenge = await Challenge.findByPk(id, { transaction });

    if (!challenge) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Desafío no encontrado'
      });
    }

    // Verificar que el usuario es un participante del desafío
    const participant = await Participant.findOne({
      where: {
        challengeId: id,
        userId: userId
      },
      transaction
    });

    if (!participant) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'No eres participante de este desafío'
      });
    }

    // Actualizar el estado del participante a 'rejected'
    await participant.update({ status: 'rejected' }, { transaction });

    // Actualizar el estado del desafío a 'cancelled'
    await challenge.update({ status: 'cancelled' }, { transaction });

    await transaction.commit();

    try {
      // Obtener el desafío actualizado para devolverlo en la respuesta
      const updatedChallenge = await Challenge.findByPk(id, {
        include: [
          { model: User, as: 'creator' },
          { model: Participant, include: [{ model: User, as: 'user' }] }
        ]
      });

      return res.status(200).json({
        success: true,
        message: 'Desafío rechazado con éxito',
        data: updatedChallenge
      });
    } catch (error) {
      console.error('Error al obtener el desafío actualizado:', error);
      // No hacemos rollback aquí porque la transacción principal ya fue confirmada
      return res.status(200).json({
        success: true,
        message: 'Desafío rechazado con éxito, pero hubo un error al obtener los detalles actualizados',
        data: {
          challengeId: id,
          status: 'cancelled',
          participantStatus: 'rejected'
        }
      });
    }
  } catch (error) {
    // Solo hacemos rollback si la transacción no ha sido confirmada
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('Error al rechazar el desafío:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al rechazar el desafío',
      error: error.message
    });
  }
};

// Cancelar un desafío
exports.cancelChallenge = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`Usuario ${userId} intentando cancelar el desafío ${id}`);

    // Verificar que el desafío existe
    const challenge = await Challenge.findByPk(id, { transaction });

    if (!challenge) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Desafío no encontrado'
      });
    }

    // Verificar que el usuario es el creador del desafío
    if (challenge.creatorId !== userId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Solo el creador puede cancelar el desafío'
      });
    }

    // Verificar que el desafío está en estado 'pending' o 'accepted'
    if (!['pending', 'accepted'].includes(challenge.status)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden cancelar desafíos pendientes o aceptados'
      });
    }

    // Actualizar el estado del desafío a 'cancelled'
    await challenge.update({ status: 'cancelled' }, { transaction });

    // Actualizar el estado de todos los participantes a 'cancelled'
    await Participant.update(
      { status: 'cancelled' },
      { where: { challengeId: id }, transaction }
    );

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: 'Desafío cancelado con éxito',
      challenge: challenge.toJSON()
    });
  } catch (error) {
    // Solo hacemos rollback si la transacción no ha sido confirmada
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('Error al cancelar el desafío:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cancelar el desafío',
      error: error.message
    });
  }
};

// Obtener desafíos específicos del usuario autenticado
exports.getUserChallenges = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`🔍 Obteniendo desafíos para usuario: ${userId}`);

    const challenges = await Challenge.findAll({
      where: {
        [Op.or]: [
          { creatorId: userId },
          { challengerId: userId },
          { judgeId: userId }
        ]
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'fullName', 'profilePicture']
        },
        {
          model: User,
          as: 'challengerUser',
          attributes: ['id', 'username', 'fullName', 'profilePicture'],
          required: false
        },
        {
          model: User,
          as: 'judgeUser',
          attributes: ['id', 'username', 'fullName', 'profilePicture'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log(`📊 Encontrados ${challenges.length} desafíos para el usuario`);

    // Get all unique category values from challenges - try both category and categoryId fields
    const categoryValues = [...new Set(challenges.map(c => c.category || c.categoryId).filter(Boolean))];
    console.log('Category values to process:', categoryValues);
    
    // Separate UUIDs from string values
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const categoryUUIDs = categoryValues.filter(val => uuidRegex.test(val));
    const categoryStrings = categoryValues.filter(val => !uuidRegex.test(val));
    
    console.log('Category UUIDs:', categoryUUIDs);
    console.log('Category strings:', categoryStrings);
    
    // Fetch categories by UUID
    let categories = [];
    if (categoryUUIDs.length > 0) {
      categories = await Category.findAll({
        where: {
          id: {
            [Op.in]: categoryUUIDs
          }
        },
        attributes: ['id', 'name', 'description']
      });
    }
    
    // Also fetch categories by name for string values
    if (categoryStrings.length > 0) {
      const categoriesByName = await Category.findAll({
        where: {
          name: {
            [Op.in]: categoryStrings
          }
        },
        attributes: ['id', 'name', 'description']
      });
      categories = [...categories, ...categoriesByName];
    }
    
    console.log('Categories found:', categories.map(c => ({ id: c.id, name: c.name })));
    
    // Create maps for quick category lookup
    const categoryMapById = {};
    const categoryMapByName = {};
    categories.forEach(cat => {
      categoryMapById[cat.id] = cat.name;
      categoryMapByName[cat.name] = cat.name;
    });
    
    // Process challenges and normalize category information
    const processedChallenges = challenges.map(challenge => {
      const challengeData = challenge.toJSON();
      
      // Normalize category information
      if (challengeData.categoryId && categoryMapById[challengeData.categoryId]) {
        challengeData.categoryName = categoryMapById[challengeData.categoryId];
        challengeData.category = categoryMapById[challengeData.categoryId];
      } else if (challengeData.category && categoryMapByName[challengeData.category]) {
        challengeData.categoryName = categoryMapByName[challengeData.category];
      } else {
        challengeData.categoryName = challengeData.category || 'Sin categoría';
      }
      
      // Add stake for frontend compatibility
      challengeData.stake = challengeData.entryFee;
      
      return challengeData;
    });

    console.log(`✅ Procesados ${processedChallenges.length} desafíos para el usuario`);

    res.status(200).json({
      success: true,
      data: processedChallenges,
      count: processedChallenges.length,
      message: 'Desafíos del usuario obtenidos exitosamente'
    });
  } catch (error) {
    console.error('❌ [getUserChallenges] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// =====================================
// UPLOAD CHALLENGE IMAGE
// =====================================

// Subir imagen de desafío
exports.uploadChallengeImage = async (req, res) => {
  try {
    console.log('📸 [uploadChallengeImage] Iniciando subida de imagen de desafío');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo'
      });
    }

    const imageUrl = `/uploads/challenges/${req.file.filename}`;
    console.log('✅ [uploadChallengeImage] Imagen subida correctamente:', imageUrl);

    res.status(200).json({
      success: true,
      message: 'Imagen subida correctamente',
      data: {
        imageUrl: imageUrl,
        filename: req.file.filename
      }
    });
  } catch (error) {
    console.error('❌ [uploadChallengeImage] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

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

    // Los modelos ya están importados al inicio del archivo

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

    // SOLUCIÓN DEFINITIVA: Verificar evidencias con READ committed para evitar datos obsoletos
    console.log(`🔍 [startJudging] Verificando evidencias pendientes para desafío ${id}`);
    
    // IMPORTANTE: Commit la transacción actual para evitar lecturas obsoletas
    await transaction.commit();
    
    // Crear nueva transacción con READ committed para lecturas frescas
    const freshTransaction = await sequelize.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });
    
    try {
      // Obtener TODAS las evidencias con datos frescos (sin transacción previa)
      const allEvidences = await Evidence.findAll({
        where: { challengeId: id },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'username']
        }],
        transaction: freshTransaction,
        // Forzar lectura fresca de la base de datos
        paranoid: false,
        raw: false
      });
      
      console.log(`📊 [DEBUG] Total evidencias encontradas (lectura fresca): ${allEvidences.length}`);
      allEvidences.forEach((evidence, index) => {
        console.log(`📊 [DEBUG] Evidencia ${index + 1}: ID=${evidence.id}, Status=${evidence.status}, User=${evidence.user?.fullName || 'N/A'}, UpdatedAt=${evidence.updatedAt}`);
      });
      
      // Verificar evidencias pendientes con datos frescos
      const pendingEvidences = await Evidence.findAll({
        where: { 
          challengeId: id,
          status: 'pending'
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'username']
        }],
        transaction: freshTransaction
      });

      if (pendingEvidences.length > 0) {
        console.log(`❌ [startJudging] Encontradas ${pendingEvidences.length} evidencias pendientes`);
        
        await freshTransaction.rollback();
        return res.status(400).json({
          success: false,
          message: `No se puede iniciar la evaluación. Hay ${pendingEvidences.length} evidencia(s) pendiente(s) de procesar.`,
          details: {
            pendingEvidencesCount: pendingEvidences.length,
            pendingEvidences: pendingEvidences.map(evidence => ({
              id: evidence.id,
              description: evidence.description.substring(0, 50) + (evidence.description.length > 50 ? '...' : ''),
              submitter: evidence.user?.fullName || evidence.user?.username || 'Usuario desconocido',
              createdAt: evidence.createdAt
            })),
            requirement: 'Todas las evidencias deben estar aprobadas o rechazadas antes de iniciar la evaluación de reglas'
          }
        });
      }

      console.log(`✅ [startJudging] Todas las evidencias están procesadas. Procediendo con la evaluación.`);

      // Recargar el challenge con la nueva transacción
      const freshChallenge = await Challenge.findByPk(id, {
        transaction: freshTransaction
      });

      // Actualizar el estado del desafío a 'judging'
      await freshChallenge.update({
        status: 'judging',
        judgingStartedAt: new Date()
      }, { transaction: freshTransaction });

      // 🤖 EJECUTAR AUTO-EVALUACIÓN DE REGLAS SIN EVIDENCIAS VÁLIDAS
      console.log(`🤖 [startJudging] Ejecutando auto-evaluación de reglas sin evidencias válidas...`);
      
      const autoEvaluationResult = await autoEvaluateRulesWithoutValidEvidence(id, userId, freshTransaction);
      
      console.log(`✅ [startJudging] Auto-evaluación completada: ${autoEvaluationResult.autoEvaluatedCount} reglas auto-evaluadas`);

      // Crear evento de timeline
      const judge = await User.findByPk(userId, {
        attributes: ['fullName', 'username'],
        transaction: freshTransaction
      });
      
      await TimelineEvent.create({
        challengeId: id,
        type: 'judging_started',
        description: `El juez ${judge?.fullName || judge?.username || 'Juez'} inició la evaluación del desafío.`,
        userId: userId
      }, { transaction: freshTransaction });

      await freshTransaction.commit();
      
      console.log(`✅ [startJudging] Evaluación iniciada exitosamente para desafío ${id}`);
      
      // Preparar mensaje de respuesta con información de auto-evaluación
      let responseMessage = 'Evaluación iniciada exitosamente';
      if (autoEvaluationResult.autoEvaluatedCount > 0) {
        responseMessage += `. ${autoEvaluationResult.autoEvaluatedCount} regla(s) fueron auto-evaluadas como "No Cumple" por falta de evidencias aprobadas.`;
      }
      
      res.json({
        success: true,
        message: responseMessage,
        data: {
          id: freshChallenge.id,
          status: 'judging',
          judgingStartedAt: freshChallenge.judgingStartedAt,
          autoEvaluation: {
            rulesAutoEvaluated: autoEvaluationResult.autoEvaluatedCount,
            message: autoEvaluationResult.message
          }
        }
      });
      
    } catch (error) {
      await freshTransaction.rollback();
      console.error('❌ [startJudging] Error en transacción fresca:', error);
      res.status(500).json({
        success: false,
        message: 'Error al iniciar la evaluación',
        error: error.message
      });
    }
  } catch (error) {
    // Error en la transacción original (ya fue committed)
    console.error('❌ [startJudging] Error general:', error);
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
// ADDITIONAL CHALLENGE MANAGEMENT
// =====================================

// Cerrar un desafío (solo juez)
const closeChallenge = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`🔒 [closeChallenge] Cerrando desafío ${id} por usuario ${userId}`);

    // Buscar el desafío
    const challenge = await Challenge.findByPk(id, { transaction });
    if (!challenge) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Desafío no encontrado'
      });
    }

    // Verificar que el usuario sea el juez
    if (challenge.judgeId !== userId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Solo el juez puede cerrar el desafío'
      });
    }

    // Verificar que el desafío esté en progreso
    if (challenge.status !== 'in_progress') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `No se puede cerrar un desafío en estado '${challenge.status}'`
      });
    }

    // Actualizar el estado a 'closed'
    await challenge.update({
      status: 'closed',
      closedAt: new Date()
    }, { transaction });

    // Crear evento en timeline
    await TimelineEvent.create({
      challengeId: id,
      type: 'challenge_closed',
      description: 'El desafío ha sido cerrado por el juez',
      userId: userId
    }, { transaction });

    await transaction.commit();
    console.log(`✅ [closeChallenge] Desafío ${id} cerrado correctamente`);

    res.status(200).json({
      success: true,
      message: 'Desafío cerrado correctamente',
      data: {
        challengeId: id,
        status: 'closed',
        closedAt: challenge.closedAt
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error(`❌ [closeChallenge] Error:`, error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Determinar ganador basado en reglas
const determineWinnerByRules = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`🏆 [determineWinnerByRules] Determinando ganador del desafío ${id}`);

    // Buscar el desafío
    const challenge = await Challenge.findByPk(id, { transaction });
    if (!challenge) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Desafío no encontrado'
      });
    }

    // Verificar que el usuario sea el juez
    if (challenge.judgeId !== userId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Solo el juez puede determinar el ganador'
      });
    }

    // Verificar que el desafío esté en estado 'judging'
    if (challenge.status !== 'judging') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `El desafío debe estar en estado 'judging' para determinar el ganador. Estado actual: '${challenge.status}'`
      });
    }

    // ASEGURAR QUE EXISTAN TODOS LOS REGISTROS RULECOMPLIANCE
    console.log(`🔧 [determineWinnerByRules] Asegurando que existan todos los registros RuleCompliance...`);
    await ensureAllRuleComplianceRecords(id, transaction);
    
    // NUEVA VALIDACIÓN: Verificar que todas las reglas estén evaluadas
    console.log(`🔍 [determineWinnerByRules] ========== INICIANDO VALIDACIÓN ==========`);
    console.log(`🔍 [determineWinnerByRules] Desafío ID: ${id}`);
    console.log(`🔍 [determineWinnerByRules] Verificando completitud de evaluaciones...`);
    
    const judgeControlService = require('../services/judgeControlService');
    const canDetermineResult = await judgeControlService.canDetermineWinner(id);
    
    console.log(`🔍 [determineWinnerByRules] Resultado de validación:`, {
      canDetermine: canDetermineResult.canDetermine,
      totalPending: canDetermineResult.totalPending,
      totalRequired: canDetermineResult.totalRequired,
      totalCompleted: canDetermineResult.totalCompleted
    });
    
    if (!canDetermineResult.canDetermine) {
      console.log(`❌ [determineWinnerByRules] VALIDACIÓN FALLIDA - No se puede determinar ganador`);
      console.log(`❌ [determineWinnerByRules] Reglas pendientes: ${canDetermineResult.totalPending}`);
      console.log(`❌ [determineWinnerByRules] Detalles de reglas pendientes:`, canDetermineResult.pendingRules);
      
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `No se puede determinar el ganador. Faltan ${canDetermineResult.totalPending} regla(s) por evaluar.`,
        details: {
          totalPending: canDetermineResult.totalPending,
          totalRequired: canDetermineResult.totalRequired,
          totalCompleted: canDetermineResult.totalCompleted,
          pendingRules: canDetermineResult.pendingRules.map(rule => ({
            ruleId: rule.ruleId,
            ruleDescription: rule.ruleDescription,
            participantId: rule.participantId,
            participantName: rule.participantName,
            status: rule.status
          })),
          requirement: 'Todas las reglas deben estar evaluadas para todos los participantes antes de determinar el ganador',
          nextSteps: [
            'Ve a la sección "Evaluación" en la pestaña Juez',
            'Evalúa cada regla marcando "Cumple" o "No Cumple" para cada participante',
            'Una vez evaluadas todas las reglas, podrás determinar el ganador'
          ]
        }
      });
    }
    
    console.log(`✅ [determineWinnerByRules] VALIDACIÓN EXITOSA - Todas las reglas evaluadas. Procediendo con determinación de ganador.`);
    
    // Usar el servicio de determinación de ganador
    try {
      const winnerDeterminationService = require('../services/winnerDeterminationService');
      const winnerResult = await winnerDeterminationService.determineWinnerByRules(id, transaction);
      
      console.log(`🏆 [determineWinnerByRules] Ganador determinado exitosamente`);
      console.log(`🏆 [determineWinnerByRules] Resultado completo:`, winnerResult);
      
      // Actualizar el estado del desafío a 'completed'
      await challenge.update({
        status: 'completed',
        completedAt: new Date()
      }, { transaction });
      
      // Crear evento en timeline
      const winnerName = winnerResult.isTie ? 'Empate' : 
        (winnerResult.winnerName || `Participante ${winnerResult.winnerId}`);
      
      await TimelineEvent.create({
        challengeId: id,
        type: 'challenge_completed',
        description: `Desafío completado. Ganador: ${winnerName}`,
        userId: userId
      }, { transaction });
      
      // Enviar notificaciones a todos los participantes
      const participants = await Participant.findAll({
        where: { challengeId: id },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'fullName', 'email']
        }],
        transaction
      });
      
      await transaction.commit();
      
      // Enviar notificaciones después del commit (para evitar problemas de transacción)
      for (const participant of participants) {
        try {
          const notificationController = require('./notificationController');
          const isWinner = participant.id === winnerResult.winnerId;
          
          const notificationMessage = isWinner 
            ? `🏆 ¡Felicidades! Has ganado el desafío "${challenge.title}". ${winnerResult.reason}`
            : `📊 El desafío "${challenge.title}" ha terminado. Ganador: ${winnerName}. ${winnerResult.reason}`;
          
          await notificationController.createNotification({
            body: {
              userId: participant.user.id,
              type: 'challenge_completed',
              title: isWinner ? '🏆 ¡Has ganado!' : '📊 Desafío completado',
              message: notificationMessage,
              relatedId: id,
              relatedType: 'challenge'
            }
          }, {
            status: () => ({ json: () => {} })
          });
          
          console.log(`📧 [determineWinnerByRules] Notificación enviada a ${participant.user.fullName} (${participant.user.username})`);
        } catch (notifError) {
          console.error(`❌ [determineWinnerByRules] Error enviando notificación a participante ${participant.user.id}:`, notifError);
        }
      }
      
      res.status(200).json({
        success: true,
        message: `Ganador determinado exitosamente: ${winnerName}`,
        data: {
          challengeId: id,
          winnerId: winnerResult.winnerId,
          winnerName: winnerResult.winnerName,
          winnerReason: winnerResult.reason,
          isTie: winnerResult.isTie,
          completedAt: new Date(),
          status: 'completed'
        }
      });
      
    } catch (winnerError) {
      console.error(`❌ [determineWinnerByRules] Error en determinación de ganador:`, winnerError);
      await transaction.rollback();
      
      return res.status(500).json({
        success: false,
        message: 'Error al determinar el ganador',
        error: winnerError.message,
        details: {
          step: 'winner_determination',
          suggestion: 'Verifica que todas las evaluaciones estén correctamente guardadas en la base de datos'
        }
      });
    }
  } catch (error) {
    await transaction.rollback();
    console.error(`❌ [determineWinnerByRules] Error:`, error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// =====================================
// AUTO-EVALUATION SYSTEM
// =====================================

/**
 * Asegurar que existan todos los registros RuleCompliance necesarios
 * @param {string} challengeId - ID del desafío
 * @param {Object} transaction - Transacción de base de datos
 * @returns {Promise<Object>} - Resultado de la operación
 */
const ensureAllRuleComplianceRecords = async (challengeId, transaction) => {
  try {
    console.log(`🔧 [ensureRecords] Asegurando registros RuleCompliance para desafío ${challengeId}`);
    
    // 1. Obtener todas las reglas del desafío
    const rules = await Rule.findAll({
      where: { challengeId },
      transaction
    });
    
    // 2. Obtener todos los participantes del desafío
    const participants = await Participant.findAll({
      where: { challengeId },
      transaction
    });
    
    console.log(`📊 [ensureRecords] Reglas: ${rules.length}, Participantes: ${participants.length}`);
    
    let createdCount = 0;
    
    // 3. Para cada combinación regla-participante
    for (const rule of rules) {
      for (const participant of participants) {
        
        // 4. Verificar si ya existe el registro
        const existingRecord = await RuleCompliance.findOne({
          where: {
            ruleId: rule.id,
            participantId: participant.id
          },
          transaction
        });
        
        // 5. Si no existe, crear registro pendiente
        if (!existingRecord) {
          await RuleCompliance.create({
            ruleId: rule.id,
            participantId: participant.id,
            judgeId: null,
            isCompliant: null, // Pendiente de evaluación
            judgeComments: null,
            evaluatedAt: null,
            autoEvaluated: false
          }, { transaction });
          
          createdCount++;
          console.log(`🆕 [ensureRecords] Creado registro pendiente: Regla "${rule.description}" para participante ${participant.id}`);
        }
      }
    }
    
    console.log(`✅ [ensureRecords] Completado: ${createdCount} registros creados`);
    
    return {
      success: true,
      createdCount,
      message: `${createdCount} registros RuleCompliance creados`
    };
    
  } catch (error) {
    console.error(`❌ [ensureRecords] Error:`, error);
    throw error;
  }
};

/**
 * Auto-evaluar reglas sin evidencias válidas como "No Cumple"
 * @param {string} challengeId - ID del desafío
 * @param {Object} transaction - Transacción de base de datos
 * @returns {Promise<Object>} - Resultado de la auto-evaluación
 */
const autoEvaluateRulesWithoutValidEvidence = async (challengeId, judgeId, transaction) => {
  try {
    console.log(`🤖 [autoEvaluate] Iniciando auto-evaluación para desafío ${challengeId}`);
    
    // 1. Obtener todas las reglas del desafío
    const rules = await Rule.findAll({
      where: { challengeId },
      transaction
    });
    
    // 2. Obtener todos los participantes del desafío
    const participants = await Participant.findAll({
      where: { challengeId },
      transaction
    });
    
    console.log(`📊 [autoEvaluate] Encontradas ${rules.length} reglas y ${participants.length} participantes`);
    
    let autoEvaluatedCount = 0;
    const autoEvaluations = [];
    
    // 3. Para cada combinación regla-participante
    for (const rule of rules) {
      for (const participant of participants) {
        
        // 4. Verificar si ya existe una evaluación
        const existingEvaluation = await RuleCompliance.findOne({
          where: {
            ruleId: rule.id,
            participantId: participant.id
          },
          transaction
        });
        
        // Solo procesar si no existe evaluación previa
        if (!existingEvaluation) {
          
          // 5. Buscar evidencias aprobadas vinculadas a esta regla para este participante
          const approvedEvidences = await Evidence.findAll({
            where: {
              challengeId: challengeId,
              userId: participant.userId,
              status: 'approved'
            },
            include: [{
              model: EvidenceRuleCompliance,
              as: 'ruleCompliances',
              where: { ruleId: rule.id },
              required: true
            }],
            transaction
          });
          
          console.log(`🔍 [autoEvaluate] Regla ${rule.id} - Participante ${participant.id}: ${approvedEvidences.length} evidencias aprobadas`);
          
          // 6. Crear registro RuleCompliance
          if (approvedEvidences.length === 0) {
            // Sin evidencias aprobadas → Auto-evaluar como "No Cumple"
            const autoEvaluation = await RuleCompliance.create({
              ruleId: rule.id,
              participantId: participant.id,
              judgeId: judgeId, // ID del juez que inicia la evaluación
              isCompliant: false,
              judgeComments: 'Auto-evaluado por el sistema: Sin evidencias aprobadas vinculadas a esta regla',
              evaluatedAt: new Date(),
              autoEvaluated: true
            }, { transaction });
            
            autoEvaluatedCount++;
            autoEvaluations.push({
              ruleId: rule.id,
              ruleDescription: rule.description,
              participantId: participant.id,
              evaluationId: autoEvaluation.id
            });
            
            console.log(`🤖 [autoEvaluate] Auto-evaluada: Regla "${rule.description}" para participante ${participant.id} → No Cumple`);
          } else {
            // Con evidencias aprobadas → Crear registro pendiente para evaluación manual
            await RuleCompliance.create({
              ruleId: rule.id,
              participantId: participant.id,
              judgeId: judgeId, // ID del juez que evaluará manualmente
              isCompliant: null, // Pendiente de evaluación manual
              judgeComments: null,
              evaluatedAt: null,
              autoEvaluated: false
            }, { transaction });
            
            console.log(`📝 [autoEvaluate] Registro creado para evaluación manual: Regla "${rule.description}" para participante ${participant.id}`);
          }
        }
      }
    }
    
    console.log(`✅ [autoEvaluate] Completado: ${autoEvaluatedCount} reglas auto-evaluadas como "No Cumple"`);
    
    return {
      success: true,
      autoEvaluatedCount,
      autoEvaluations,
      message: `${autoEvaluatedCount} reglas auto-evaluadas como "No Cumple" por falta de evidencias aprobadas`
    };
    
  } catch (error) {
    console.error(`❌ [autoEvaluate] Error en auto-evaluación:`, error);
    throw error;
  }
};

// =====================================
// EVIDENCE-RULE COMPLIANCE ENDPOINTS
// =====================================

// Vincular evidencia con reglas
const linkEvidenceToRules = async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const { ruleIds } = req.body;
    const userId = req.user.id;
    
    console.log(`📎 [linkEvidenceToRules] Vinculando evidencia ${evidenceId} a reglas:`, ruleIds);
    
    if (!Array.isArray(ruleIds) || ruleIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs de reglas'
      });
    }
    
    const evidenceRuleService = require('../services/evidenceRuleService');
    const result = await evidenceRuleService.linkEvidenceToRules(evidenceId, ruleIds, userId);
    
    console.log(`✅ [linkEvidenceToRules] Evidencia vinculada exitosamente`);
    
    res.json(result);
  } catch (error) {
    console.error('❌ [linkEvidenceToRules] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al vincular evidencia con reglas',
      error: error.message
    });
  }
};

// Obtener matriz de evaluación para juez
const getEvaluationMatrix = async (req, res) => {
  try {
    const { id: challengeId } = req.params;
    const judgeId = req.user.id;
    
    console.log(`📊 [getEvaluationMatrix] Obteniendo matriz para desafío ${challengeId}`);
    
    const evidenceRuleService = require('../services/evidenceRuleService');
    const result = await evidenceRuleService.getEvaluationMatrix(challengeId, judgeId);
    
    console.log(`✅ [getEvaluationMatrix] Matriz obtenida exitosamente`);
    
    res.json(result);
  } catch (error) {
    console.error('❌ [getEvaluationMatrix] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener matriz de evaluación',
      error: error.message
    });
  }
};

// Obtener vínculos evidencia-regla de un participante
const getParticipantEvidenceRuleLinks = async (req, res) => {
  try {
    const { id: challengeId } = req.params;
    const userId = req.user.id;
    
    console.log(`🔗 [getParticipantEvidenceRuleLinks] Obteniendo vínculos para usuario ${userId}`);
    
    const evidenceRuleService = require('../services/evidenceRuleService');
    const result = await evidenceRuleService.getParticipantEvidenceRuleLinks(challengeId, userId);
    
    console.log(`✅ [getParticipantEvidenceRuleLinks] Vínculos obtenidos exitosamente`);
    
    res.json(result);
  } catch (error) {
    console.error('❌ [getParticipantEvidenceRuleLinks] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener vínculos de evidencia-regla',
      error: error.message
    });
  }
};

// Verificar completitud de evaluaciones
const checkEvaluationCompleteness = async (req, res) => {
  try {
    const { id: challengeId } = req.params;
    const judgeId = req.user.id;
    
    console.log(`✅ [checkEvaluationCompleteness] Verificando completitud para desafío ${challengeId}`);
    
    // Verificar que el usuario es juez del desafío
    const challenge = await Challenge.findOne({
      where: { id: challengeId, judgeId: judgeId }
    });
    
    if (!challenge) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para evaluar este desafío'
      });
    }
    
    const evidenceRuleService = require('../services/evidenceRuleService');
    const result = await evidenceRuleService.checkEvaluationCompleteness(challengeId);
    
    console.log(`✅ [checkEvaluationCompleteness] Completitud verificada`);
    
    res.json(result);
  } catch (error) {
    console.error('❌ [checkEvaluationCompleteness] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar completitud de evaluaciones',
      error: error.message
    });
  }
};

// Obtener desafíos del usuario autenticado
exports.getUserChallenges = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`🔍 [getUserChallenges] Obteniendo desafíos para usuario ${userId}`);
    
    // Usar consulta SQL cruda con JOINs para incluir datos de usuarios
    const query = `
      SELECT DISTINCT 
        c.*,
        creator.id as creator_id_data,
        creator.username as creator_username,
        creator.full_name as creator_full_name,
        creator.profile_picture as creator_profile_picture,
        challenger.id as challenger_id_data,
        challenger.username as challenger_username,
        challenger.full_name as challenger_full_name,
        challenger.profile_picture as challenger_profile_picture,
        judge.id as judge_id_data,
        judge.username as judge_username,
        judge.full_name as judge_full_name,
        judge.profile_picture as judge_profile_picture,
        winner.id as winner_id_data,
        winner.username as winner_username,
        winner.full_name as winner_full_name,
        winner.profile_picture as winner_profile_picture,
        cat.id as category_id_data,
        cat.name as category_name,
        cat.description as category_description
      FROM challenges c
      LEFT JOIN participants p ON c.id = p.challenge_id
      LEFT JOIN users creator ON c.creator_id = creator.id
      LEFT JOIN users challenger ON c.challenger_id = challenger.id
      LEFT JOIN users judge ON c.judge_id = judge.id
      LEFT JOIN users winner ON c.winner_id = winner.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.creator_id = :userId 
         OR c.challenger_id = :userId 
         OR p.user_id = :userId
      ORDER BY c.created_at DESC
    `;
    
    const rawChallenges = await sequelize.query(query, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });
    
    // Transformar los datos para que coincidan con el formato esperado por el frontend
    const challenges = rawChallenges.map(challenge => ({
      ...challenge,
      creator: challenge.creator_id_data ? {
        id: challenge.creator_id_data,
        username: challenge.creator_username,
        fullName: challenge.creator_full_name,
        profilePicture: challenge.creator_profile_picture
      } : null,
      challengerUser: challenge.challenger_id_data ? {
        id: challenge.challenger_id_data,
        username: challenge.challenger_username,
        fullName: challenge.challenger_full_name,
        profilePicture: challenge.challenger_profile_picture
      } : null,
      judgeUser: challenge.judge_id_data ? {
        id: challenge.judge_id_data,
        username: challenge.judge_username,
        fullName: challenge.judge_full_name,
        profilePicture: challenge.judge_profile_picture
      } : null,
      winner: challenge.winner_id_data ? {
        id: challenge.winner_id_data,
        username: challenge.winner_username,
        fullName: challenge.winner_full_name,
        profilePicture: challenge.winner_profile_picture
      } : null,
      categoryInfo: challenge.category_id_data ? {
        id: challenge.category_id_data,
        name: challenge.category_name,
        description: challenge.category_description
      } : null
    }));
    
    console.log(`✅ [getUserChallenges] ${challenges.length} desafíos encontrados`);
    
    res.json({
      success: true,
      data: challenges
    });
  } catch (error) {
    console.error('❌ [getUserChallenges] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener desafíos del usuario',
      error: error.message
    });
  }
};

// =====================================
// EXPORTS
// =====================================

// Note: All functions are already exported using exports.functionName pattern above
// The rules system functions are defined as regular functions and exported here
module.exports = {
  ...module.exports, // Include all the exports.functionName definitions
  
  // Endpoints del sistema de reglas (IMPLEMENTADOS)
  getChallengeRules,
  startJudging,
  evaluateRule,
  
  // Additional challenge management functions
  closeChallenge,
  determineWinnerByRules,
  
  // Evidence-Rule Compliance System (NUEVOS)
  linkEvidenceToRules,
  getEvaluationMatrix,
  getParticipantEvidenceRuleLinks,
  checkEvaluationCompleteness
};
