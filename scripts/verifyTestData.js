const { User } = require('../src/models');
const { mongoModels } = require('../src/models');
const { FriendNetwork, FriendRequest, Friendship } = mongoModels;
const { sequelize } = require('../src/config/database');
const { mongoose } = require('../src/config/mongodb');

async function verifyData() {
  try {
    console.log('\n=== VERIFICANDO DATOS DE PRUEBA ===\n');
    
    // Verificar usuarios PostgreSQL
    const userCount = await User.count();
    console.log(`Total de usuarios PostgreSQL: ${userCount}`);
    
    const eloyUser = await User.findOne({ where: { username: 'EloyG' } });
    console.log(`Usuario EloyG existe: ${!!eloyUser}`);
    
    if (eloyUser) {
      console.log(`ID de EloyG: ${eloyUser.id}`);
      
      // Verificar red de amigos de EloyG en MongoDB
      const eloyNetwork = await FriendNetwork.findOne({ userId: eloyUser.id })
        .populate('friends')
        .populate('pendingRequests')
        .populate('sentRequests');
      
      if (eloyNetwork) {
        console.log('\n--- Red de amistad de EloyG ---');
        console.log(`Amigos: ${eloyNetwork.friends.length}`);
        console.log(`Solicitudes recibidas: ${eloyNetwork.pendingRequests.length}`);
        console.log(`Solicitudes enviadas: ${eloyNetwork.sentRequests.length}`);
        console.log(`Usuarios bloqueados: ${eloyNetwork.blockedUsers.length}`);
        
        // Mostrar los amigos de EloyG
        console.log('\nAmigos de EloyG:');
        for (const friendship of eloyNetwork.friends) {
          const friendId = friendship.users.find(id => id !== eloyUser.id);
          const friendData = await User.findByPk(friendId);
          if (friendData) {
            console.log(`- ${friendData.username} (${friendData.fullName})`);
          }
        }
        
        // Mostrar las solicitudes pendientes
        if (eloyNetwork.pendingRequests.length > 0) {
          console.log('\nSolicitudes pendientes para EloyG:');
          for (const request of eloyNetwork.pendingRequests) {
            const requesterData = await User.findByPk(request.from);
            if (requesterData) {
              console.log(`- ${requesterData.username} (${requesterData.fullName})`);
            }
          }
        }
        
        // Mostrar usuarios bloqueados
        if (eloyNetwork.blockedUsers.length > 0) {
          console.log('\nUsuarios bloqueados por EloyG:');
          for (const blockedId of eloyNetwork.blockedUsers) {
            const blockedData = await User.findByPk(blockedId);
            if (blockedData) {
              console.log(`- ${blockedData.username} (${blockedData.fullName})`);
            }
          }
        }
        
        // Verificar usuarios para sugerencias (utilizando la misma lógica que la función de sugerencias)
        console.log('\n=== POSIBLES SUGERENCIAS PARA ELOYO ===\n');
        
        // Recopilación de IDs de amigos
        const friendIds = [];
        eloyNetwork.friends.forEach(friendship => {
          friendship.users.forEach(userId => {
            if (userId !== eloyUser.id) {
              friendIds.push(userId);
            }
          });
        });
        console.log(`EloyG tiene ${friendIds.length} amigos directos`);
        
        // Obtener redes de amigos de los amigos de EloyG
        const friendsOfFriendsIds = new Set();
        for (const friendId of friendIds) {
          const friendNetwork = await FriendNetwork.findOne({ userId: friendId })
            .populate('friends');
          
          if (friendNetwork && friendNetwork.friends) {
            friendNetwork.friends.forEach(friendship => {
              friendship.users.forEach(userId => {
                if (userId !== eloyUser.id && !friendIds.includes(userId)) {
                  friendsOfFriendsIds.add(userId);
                }
              });
            });
          }
        }
        
        // Filtrar bloqueados y solicitudes pendientes
        const blockedIds = new Set(eloyNetwork.blockedUsers);
        const pendingRequestIds = new Set();
        eloyNetwork.pendingRequests.forEach(req => pendingRequestIds.add(req.from));
        eloyNetwork.sentRequests.forEach(req => pendingRequestIds.add(req.to));
        
        const potentialSuggestionsIds = [...friendsOfFriendsIds].filter(id => 
          !blockedIds.has(id) && !pendingRequestIds.has(id)
        );
        
        console.log(`Potenciales sugerencias (amigos de amigos): ${potentialSuggestionsIds.length}`);
        
        // Mostrar las posibles sugerencias
        if (potentialSuggestionsIds.length > 0) {
          console.log('\nPosibles sugerencias para EloyG:');
          for (const id of potentialSuggestionsIds) {
            const userData = await User.findByPk(id);
            if (userData) {
              console.log(`- ${userData.username} (${userData.fullName})`);
            }
          }
        } else {
          console.log('No hay sugerencias disponibles basadas en amigos de amigos');
        }
      } else {
        console.log('No se encontró la red de amistad para EloyG');
      }
    }
    
  } catch (error) {
    console.error('Error al verificar datos:', error);
  } finally {
    // Cerrar conexiones
    await mongoose.connection.close();
    await sequelize.close();
  }
}

// Ejecutar la verificación
verifyData();
