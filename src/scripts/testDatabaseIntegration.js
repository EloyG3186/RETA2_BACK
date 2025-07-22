/**
 * Script para probar la integración entre PostgreSQL y MongoDB
 * 
 * Este script verifica que ambas bases de datos estén funcionando correctamente
 * y que puedan interactuar entre sí en nuestra arquitectura de persistencia políglota.
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const { connectMongoDB } = require('../config/mongodb');
const { Op } = require('sequelize');
const { User, Challenge } = require('../models');
const Chat = require('../models/mongodb/Chat');
const Community = require('../models/mongodb/Community');
const Testimonial = require('../models/mongodb/Testimonial');
const { FriendNetwork } = require('../models/mongodb/FriendNetwork');

// Función para probar la conexión a PostgreSQL
async function testPostgreSQL() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida correctamente.');
    
    // Contar usuarios
    const userCount = await User.count();
    console.log(`📊 Número de usuarios en PostgreSQL: ${userCount}`);
    
    // Contar desafíos
    const challengeCount = await Challenge.count();
    console.log(`📊 Número de desafíos en PostgreSQL: ${challengeCount}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con PostgreSQL:', error);
    return false;
  }
}

// Función para probar la conexión a MongoDB
async function testMongoDB() {
  try {
    const connected = await connectMongoDB();
    
    if (connected) {
      console.log('✅ Conexión a MongoDB establecida correctamente.');
      
      // Contar chats
      const chatCount = await Chat.countDocuments();
      console.log(`📊 Número de chats en MongoDB: ${chatCount}`);
      
      // Contar comunidades
      const communityCount = await Community.countDocuments();
      console.log(`📊 Número de comunidades en MongoDB: ${communityCount}`);
      
      // Contar testimonios
      const testimonialCount = await Testimonial.countDocuments();
      console.log(`📊 Número de testimonios en MongoDB: ${testimonialCount}`);
      
      // Contar redes de amigos
      const friendNetworkCount = await FriendNetwork.countDocuments();
      console.log(`📊 Número de redes de amigos en MongoDB: ${friendNetworkCount}`);
      
      return true;
    } else {
      console.error('❌ No se pudo conectar a MongoDB.');
      return false;
    }
  } catch (error) {
    console.error('❌ Error al conectar con MongoDB:', error);
    return false;
  }
}

// Función para probar la integración entre ambas bases de datos
async function testIntegration() {
  try {
    console.log('\n🔄 Probando integración entre PostgreSQL y MongoDB...');
    
    // Obtener un usuario de PostgreSQL
    const user = await User.findOne();
    
    if (!user) {
      console.log('❌ No se encontraron usuarios en PostgreSQL para probar la integración.');
      return;
    }
    
    console.log(`📌 Usuario encontrado en PostgreSQL: ${user.id} (${user.username || user.email})`);
    
    // Buscar la red de amigos del usuario en MongoDB
    const friendNetwork = await FriendNetwork.findOne({ userId: user.id });
    
    if (friendNetwork) {
      console.log(`✅ Red de amigos encontrada en MongoDB para el usuario ${user.id}`);
      console.log(`📊 Número de amigos: ${friendNetwork.friends.length}`);
      console.log(`📊 Número de solicitudes pendientes: ${friendNetwork.pendingRequests.length}`);
    } else {
      console.log(`⚠️ No se encontró red de amigos en MongoDB para el usuario ${user.id}`);
      
      // Crear una nueva red de amigos para el usuario
      const newFriendNetwork = new FriendNetwork({
        userId: user.id,
        friends: [],
        pendingRequests: [],
        sentRequests: [],
        blockedUsers: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newFriendNetwork.save();
      console.log(`✅ Creada nueva red de amigos en MongoDB para el usuario ${user.id}`);
    }
    
    // Buscar desafíos del usuario en PostgreSQL donde es creador
    const createdChallenges = await Challenge.findAll({
      where: {
        creatorId: user.id
      },
      limit: 5
    });
    
    // Buscar desafíos en los que el usuario participa (pero no es creador)
    const { Participant } = require('../models');
    const participations = await Participant.findAll({
      where: {
        userId: user.id
      },
      include: [{
        model: Challenge,
        as: 'challenge'
      }],
      limit: 5
    });
    
    // Extraer los desafíos de las participaciones
    const participatedChallenges = participations
      .map(p => p.challenge)
      .filter(c => c !== null);
    
    // Combinar ambos conjuntos de desafíos
    const challenges = [...createdChallenges, ...participatedChallenges];
    console.log(`📊 Número de desafíos creados por el usuario ${user.id}: ${createdChallenges.length}`);
    console.log(`📊 Número de desafíos en los que participa el usuario ${user.id}: ${participatedChallenges.length}`);
    
    console.log(`📊 Número de desafíos encontrados para el usuario ${user.id}: ${challenges.length}`);
    
    if (challenges.length > 0) {
      // Verificar si hay testimonios relacionados con estos desafíos
      const challengeIds = challenges.map(challenge => challenge.id);
      const testimonials = await Testimonial.find({
        challengeId: { $in: challengeIds }
      });
      
      console.log(`📊 Número de testimonios relacionados con los desafíos del usuario: ${testimonials.length}`);
      
      if (testimonials.length === 0) {
        // Crear un testimonio de prueba
        const challenge = challenges[0];
        const otherUserId = challenge.creatorId === user.id ? challenge.challengerId : challenge.creatorId;
        
        if (otherUserId) {
          const newTestimonial = new Testimonial({
            author: user.id,
            targetUser: otherUserId,
            challengeId: challenge.id,
            content: 'Este es un testimonio de prueba creado por el script de integración.',
            rating: 5,
            isVerified: false,
            tags: ['prueba', 'integración'],
            likes: [],
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          await newTestimonial.save();
          console.log(`✅ Creado testimonio de prueba en MongoDB relacionado con el desafío ${challenge.id}`);
        }
      }
    }
    
    console.log('✅ Prueba de integración completada con éxito.');
  } catch (error) {
    console.error('❌ Error al probar la integración:', error);
  }
}

// Función principal para ejecutar todas las pruebas
async function runTests() {
  console.log('🚀 Iniciando pruebas de integración de bases de datos...');
  
  const postgresConnected = await testPostgreSQL();
  console.log('-----------------------------------');
  
  const mongoConnected = await testMongoDB();
  console.log('-----------------------------------');
  
  if (postgresConnected && mongoConnected) {
    await testIntegration();
  } else {
    console.error('❌ No se puede probar la integración porque al menos una de las bases de datos no está conectada.');
  }
  
  console.log('\n🏁 Pruebas finalizadas.');
  
  // Cerrar conexiones
  await sequelize.close();
  process.exit(0);
}

// Ejecutar las pruebas
runTests().catch(error => {
  console.error('Error en las pruebas:', error);
  process.exit(1);
});
