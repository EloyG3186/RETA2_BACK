const { Op } = require('sequelize');
const { sequelize, Challenge, User, Participant, Comment, TimelineEvent, Category } = require('../models');
const notificationController = require('./notificationController');
const gamificationService = require('../services/gamificationService');

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

// Crear una nueva competencia
exports.createChallenge = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { 
      title, description, category, categoryId, startDate, endDate, 
      stake, createdBy, challenger, status, isPublic, imageUrl 
    } = req.body;
    
    console.log('🖼️ [createChallenge] imageUrl recibida:', imageUrl);
    
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
      description: `Desafío "${title}" creado por ${creator?.fullName || creator?.username || 'Usuario'} (${creator?.username || 'N/A'})`
    }, { transaction });

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
            order: [['timestamp', 'DESC']] // Más recientes primero
          });
          
          console.log(`📅 [getChallengeById] Eventos de timeline encontrados: ${timelineEvents.length}`);
          
          if (timelineEvents && timelineEvents.length > 0) {
            challengeJSON.timeline = timelineEvents.map(event => ({
              id: event.id,
              type: event.type,
              description: event.description,
              timestamp: event.timestamp
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
        challengeJSON.rules = challengeJSON.rules || [];
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
      description: `${user?.fullName || user?.username || 'Usuario'} (${user?.username || 'N/A'}) se unió al desafío`
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

    // Verificar que la competencia esté activa
    if (challenge.status !== 'active') {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Only active challenges can have a winner determined' 
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
        description: 'El desafío ha sido aceptado por todos los participantes. El creador debe asignar un juez.'
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
    
    // Create a mapping for common category strings to display names
    const categoryDisplayNames = {
      'fitness': 'Fitness',
      'learning': 'Aprendizaje', 
      'creativity': 'Creatividad',
      'health': 'Salud',
      'productivity': 'Productividad',
      'social': 'Social',
      'entertainment': 'Entretenimiento'
    };
    
    // Transform the data to match frontend expectations
    const formattedChallenges = challenges.map(challenge => {
      const challengeData = challenge.toJSON();
      
      // Map category name using either category or categoryId field
      const categoryValue = challengeData.category || challengeData.categoryId;
      let categoryName = 'Sin categoría';
      
      if (categoryValue) {
        // Check if it's a UUID (from database category)
        if (uuidRegex.test(categoryValue)) {
          categoryName = categoryMapById[categoryValue] || 'Sin categoría';
        } else {
          // It's a string category, check if we have it in our maps
          categoryName = categoryMapByName[categoryValue] || categoryDisplayNames[categoryValue] || categoryValue;
        }
      }
      
      console.log('Challenge category mapping:', {
        challengeId: challengeData.id,
        category: challengeData.category,
        categoryId: challengeData.categoryId,
        usedCategoryValue: categoryValue,
        isUUID: categoryValue ? uuidRegex.test(categoryValue) : false,
        mappedCategoryName: categoryName
      });

      return {
        ...challengeData,
        categoryName: categoryName,
        // Ensure participant data is properly formatted
        creator: challengeData.creator || { fullName: 'Usuario desconocido' },
        challenger: challengeData.challengerUser || null,
        judge: challengeData.judgeUser || null
      };
    });

    console.log(`✅ Enviando ${formattedChallenges.length} desafíos formateados`);

    return res.status(200).json({
      success: true,
      data: formattedChallenges,
      count: formattedChallenges.length,
      message: 'Desafíos del usuario obtenidos exitosamente'
    });

  } catch (error) {
    console.error('❌ Error obteniendo desafíos del usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo desafíos del usuario',
      error: error.message
    });
  }
};

// Función para subir imagen de desafío
exports.uploadChallengeImage = async (req, res) => {
  try {
    console.log('🖼️ [uploadChallengeImage] Procesando subida de imagen...');
    
    if (!req.uploadedImage) {
      console.log('❌ [uploadChallengeImage] No se encontró imagen subida');
      return res.status(400).json({
        success: false,
        error: 'No se pudo procesar la imagen',
        code: 'NO_IMAGE_PROCESSED'
      });
    }

    console.log('✅ [uploadChallengeImage] Imagen procesada exitosamente:');
    console.log('   📄 Nombre:', req.uploadedImage.filename);
    console.log('   📄 Original:', req.uploadedImage.originalname);
    console.log('   📏 Tamaño:', req.uploadedImage.size, 'bytes');
    console.log('   🌐 URL:', req.uploadedImage.url);

    // Responder con la información de la imagen
    res.json({
      success: true,
      message: 'Imagen subida exitosamente',
      data: {
        imageUrl: req.uploadedImage.url,
        filename: req.uploadedImage.filename,
        originalname: req.uploadedImage.originalname,
        size: req.uploadedImage.size,
        mimetype: req.uploadedImage.mimetype
      }
    });

  } catch (error) {
    console.error('❌ [uploadChallengeImage] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al procesar la imagen',
      error: error.message
    });
  }
};
