const { User } = require('../src/models');
const { mongoModels } = require('../src/models');
const { FriendNetwork } = mongoModels;
const { sequelize } = require('../src/config/database');
const { mongoose } = require('../src/config/mongodb');

async function basicVerify() {
  try {
    // 1. Verificar usuarios en PostgreSQL
    console.log('=== VERIFICANDO USUARIOS POSTGRESQL ===');
    const userCount = await User.count();
    console.log(`Total de usuarios PostgreSQL: ${userCount}`);
    
    // Verificar si existe EloyG
    const eloy = await User.findOne({ where: { username: 'EloyG' } });
    console.log(`Usuario EloyG existe: ${!!eloy}`);
    
    if (eloy) {
      console.log(`ID de EloyG: ${eloy.id}`);
      
      // 2. Verificar red de amigos en MongoDB
      console.log('\n=== VERIFICANDO REDES DE AMISTAD EN MONGODB ===');
      const networkCount = await FriendNetwork.countDocuments();
      console.log(`Total de redes de amistad en MongoDB: ${networkCount}`);
      
      // Verificar red de EloyG
      const eloyNetwork = await FriendNetwork.findOne({ userId: eloy.id });
      console.log(`Red de amistad de EloyG existe: ${!!eloyNetwork}`);
      
      if (eloyNetwork) {
        console.log(`- Amigos: ${eloyNetwork.friends.length}`);
        console.log(`- Solicitudes pendientes: ${eloyNetwork.pendingRequests.length}`);
        console.log(`- Solicitudes enviadas: ${eloyNetwork.sentRequests.length}`);
        console.log(`- Usuarios bloqueados: ${eloyNetwork.blockedUsers.length}`);
      }
    }
    
    // 3. Listar los 5 primeros usuarios para verificar
    console.log('\n=== MUESTRA DE USUARIOS CREADOS ===');
    const sampleUsers = await User.findAll({ limit: 5 });
    sampleUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.fullName})`);
    });
    
  } catch (error) {
    console.error('Error durante la verificación:', error);
  } finally {
    await mongoose.connection.close();
    await sequelize.close();
  }
}

basicVerify();
