const cron = require('node-cron');
const { 
  User, 
  UserAuditTrail, 
  UserLegalHold,
  UserExitSurvey,
  AccountRecoveryRequest 
} = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');

// =====================================================
// CRON JOB PARA ELIMINACIÓN AUTOMÁTICA DE DATOS
// =====================================================

/**
 * Procesar eliminación de datos personales después del período de gracia
 */
async function processPrivacyDeletion() {
  console.log('🗑️ Iniciando proceso de eliminación de datos personales...');
  
  try {
    // Calcular fecha límite (30 días atrás)
    const gracePeriodDays = 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - gracePeriodDays);
    
    console.log(`📅 Procesando cuentas desactivadas antes de: ${cutoffDate.toISOString()}`);
    
    // Buscar usuarios desactivados que han pasado el período de gracia
    const usersToProcess = await User.findAll({
      where: {
        accountStatus: 'deactivated',
        deactivatedAt: {
          [Op.lte]: cutoffDate
        },
        privacyDeletedAt: null // No procesados aún
      },
      include: [
        {
          model: UserLegalHold,
          as: 'legalHolds',
          where: { status: 'active' },
          required: false
        }
      ]
    });
    
    console.log(`👥 Encontrados ${usersToProcess.length} usuarios para procesar`);
    
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const user of usersToProcess) {
      try {
        // Verificar si hay retenciones legales activas
        if (user.legalHolds && user.legalHolds.length > 0) {
          console.log(`⚖️ Usuario ${user.username} (${user.id}) tiene retenciones legales activas. Omitiendo.`);
          skippedCount++;
          continue;
        }
        
        // Crear registro de auditoría antes de eliminar datos
        const auditData = await createAuditRecord(user);
        
        // Anonimizar datos del usuario
        await anonymizeUserData(user);
        
        processedCount++;
        console.log(`✅ Datos personales eliminados para usuario: ${auditData.originalUsername} (${user.id})`);
        
      } catch (error) {
        console.error(`❌ Error procesando usuario ${user.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`📊 Proceso completado:`);
    console.log(`   - Procesados: ${processedCount}`);
    console.log(`   - Omitidos (retención legal): ${skippedCount}`);
    console.log(`   - Errores: ${errorCount}`);
    
    return {
      processed: processedCount,
      skipped: skippedCount,
      errors: errorCount
    };
    
  } catch (error) {
    console.error('❌ Error en proceso de eliminación de datos:', error);
    throw error;
  }
}

/**
 * Crear registro de auditoría antes de eliminar datos personales
 */
async function createAuditRecord(user) {
  try {
    // Obtener estadísticas del usuario
    const stats = await getUserStatistics(user.id);
    
    // Crear hash del email para auditoría
    const emailHash = crypto.createHash('sha256').update(user.email).digest('hex');
    
    // Obtener encuesta de salida si existe
    const exitSurvey = await UserExitSurvey.findOne({
      where: { userId: user.id }
    });
    
    // Crear registro de auditoría
    const auditRecord = await UserAuditTrail.create({
      originalUserId: user.id,
      originalUsername: user.username,
      emailHash: emailHash,
      accountCreatedAt: user.createdAt,
      accountDeletedAt: user.deactivatedAt,
      deletionType: 'privacy_deletion',
      totalChallengesCreated: stats.challengesCreated,
      totalChallengesParticipated: stats.challengesParticipated,
      totalFriends: stats.friendsCount,
      totalPoints: stats.totalPoints,
      auditData: {
        lastLogin: user.lastLogin,
        accountStatus: user.accountStatus,
        privacyLevel: user.privacyLevel,
        exitSurveyId: exitSurvey ? exitSurvey.id : null,
        deletionProcessedAt: new Date().toISOString(),
        retentionReason: 'audit_and_fraud_prevention'
      }
    });
    
    console.log(`📝 Registro de auditoría creado: ${auditRecord.id}`);
    return {
      auditId: auditRecord.id,
      originalUsername: user.username
    };
    
  } catch (error) {
    console.error('Error creando registro de auditoría:', error);
    throw error;
  }
}

/**
 * Anonimizar datos personales del usuario
 */
async function anonymizeUserData(user) {
  try {
    // Generar datos anonimizados
    const anonymizedEmail = `deleted_${user.username}@audit.local`;
    const anonymizedData = {
      email: anonymizedEmail,
      firstName: null,
      lastName: null,
      phone: null,
      bio: null,
      profilePicture: null,
      accountStatus: 'privacy_deleted',
      privacyLevel: 'audit_only',
      privacyDeletedAt: new Date(),
      // Mantener campos necesarios para auditoría
      username: user.username, // Visible en conversaciones/rankings
      createdAt: user.createdAt,
      deactivatedAt: user.deactivatedAt,
      auditRetention: true
    };
    
    // Actualizar usuario con datos anonimizados
    await user.update(anonymizedData);
    
    console.log(`🔒 Datos personales anonimizados para usuario: ${user.username}`);
    
  } catch (error) {
    console.error('Error anonimizando datos del usuario:', error);
    throw error;
  }
}

/**
 * Obtener estadísticas del usuario para auditoría
 */
async function getUserStatistics(userId) {
  try {
    const { Challenge, Participation, Friendship } = require('../models');
    
    // Contar challenges creados
    const challengesCreated = await Challenge.count({
      where: { creatorId: userId }
    });
    
    // Contar participaciones
    const challengesParticipated = await Participation.count({
      where: { userId: userId }
    });
    
    // Contar amigos
    const friendsCount = await Friendship.count({
      where: {
        [Op.or]: [
          { userId: userId },
          { friendId: userId }
        ],
        status: 'accepted'
      }
    });
    
    // Obtener puntos totales del usuario
    const user = await User.findByPk(userId, {
      attributes: ['totalPoints']
    });
    
    return {
      challengesCreated,
      challengesParticipated,
      friendsCount,
      totalPoints: user ? user.totalPoints : 0
    };
    
  } catch (error) {
    console.error('Error obteniendo estadísticas del usuario:', error);
    return {
      challengesCreated: 0,
      challengesParticipated: 0,
      friendsCount: 0,
      totalPoints: 0
    };
  }
}

/**
 * Limpiar solicitudes de recuperación expiradas
 */
async function cleanupExpiredRecoveryRequests() {
  console.log('🧹 Limpiando solicitudes de recuperación expiradas...');
  
  try {
    const now = new Date();
    
    // Marcar como expiradas las solicitudes vencidas
    const [updatedCount] = await AccountRecoveryRequest.update(
      { status: 'expired' },
      {
        where: {
          status: 'pending',
          expiresAt: {
            [Op.lt]: now
          }
        }
      }
    );
    
    console.log(`📝 Marcadas como expiradas ${updatedCount} solicitudes de recuperación`);
    
    // Eliminar solicitudes muy antiguas (más de 1 año)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const deletedCount = await AccountRecoveryRequest.destroy({
      where: {
        createdAt: {
          [Op.lt]: oneYearAgo
        },
        status: {
          [Op.in]: ['expired', 'rejected']
        }
      }
    });
    
    console.log(`🗑️ Eliminadas ${deletedCount} solicitudes antiguas`);
    
    return {
      expired: updatedCount,
      deleted: deletedCount
    };
    
  } catch (error) {
    console.error('❌ Error limpiando solicitudes de recuperación:', error);
    throw error;
  }
}

/**
 * Configurar trabajos cron para eliminación de cuenta
 */
function setupAccountDeletionCronJobs() {
  console.log('⏰ Configurando trabajos cron para eliminación de cuenta...');
  
  // Ejecutar eliminación de datos personales diariamente a las 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('🕐 Ejecutando trabajo cron: eliminación de datos personales');
    try {
      await processPrivacyDeletion();
    } catch (error) {
      console.error('❌ Error en trabajo cron de eliminación:', error);
    }
  }, {
    scheduled: true,
    timezone: "America/Mexico_City"
  });
  
  // Limpiar solicitudes de recuperación expiradas cada 6 horas
  cron.schedule('0 */6 * * *', async () => {
    console.log('🕐 Ejecutando trabajo cron: limpieza de solicitudes de recuperación');
    try {
      await cleanupExpiredRecoveryRequests();
    } catch (error) {
      console.error('❌ Error en trabajo cron de limpieza:', error);
    }
  }, {
    scheduled: true,
    timezone: "America/Mexico_City"
  });
  
  console.log('✅ Trabajos cron de eliminación de cuenta configurados exitosamente');
}

/**
 * Ejecutar eliminación manual (para testing)
 */
async function runManualDeletion() {
  console.log('🔧 Ejecutando eliminación manual de datos...');
  try {
    const result = await processPrivacyDeletion();
    await cleanupExpiredRecoveryRequests();
    return result;
  } catch (error) {
    console.error('❌ Error en eliminación manual:', error);
    throw error;
  }
}

module.exports = {
  setupAccountDeletionCronJobs,
  processPrivacyDeletion,
  cleanupExpiredRecoveryRequests,
  runManualDeletion
};
