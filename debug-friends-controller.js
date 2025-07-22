const mongoose = require('mongoose');
const { Sequelize, DataTypes, Op } = require('sequelize');

// Configurar conexión a PostgreSQL
const sequelize = new Sequelize('challenge_friends', 'postgres', 'admin', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

// Definir modelo User de PostgreSQL
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  profilePicture: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true
});

async function debugFriendsController() {
  try {
    console.log('🔍 [DEBUG] Iniciando debug del controlador getFriends...\n');
    
    // 1. Conectar a MongoDB
    console.log('1️⃣ Conectando a MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/challenge_friends_social');
    console.log('✅ Conectado a MongoDB');
    
    // 2. Definir esquema de FriendNetwork
    const friendNetworkSchema = new mongoose.Schema({
      userId: String,
      friends: [{
        users: [String],
        status: String,
        createdAt: { type: Date, default: Date.now }
      }]
    });
    
    const FriendNetwork = mongoose.model('FriendNetwork', friendNetworkSchema);
    
    // 3. Conectar a PostgreSQL
    console.log('2️⃣ Conectando a PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL');
    
    // 4. Simular la lógica del controlador getFriends
    const userId = '91f709ca-3830-488c-9168-fbe5bd68ba90'; // EloyG
    console.log(`\n3️⃣ Simulando getFriends para usuario: ${userId}`);
    
    // Buscar la red de amigos del usuario en MongoDB
    console.log('🔍 Buscando red de amigos en MongoDB...');
    const friendNetwork = await FriendNetwork.findOne({ userId });
    
    if (!friendNetwork || !friendNetwork.friends || friendNetwork.friends.length === 0) {
      console.log('❌ No se encontraron amigos para el usuario:', userId);
      return;
    }
    
    console.log('✅ Red de amigos encontrada:', friendNetwork.friends.length, 'amistades');
    console.log('📊 Datos de la red de amigos:');
    friendNetwork.friends.forEach((friendship, index) => {
      console.log(`   ${index + 1}. Users: [${friendship.users.join(', ')}], Status: ${friendship.status}`);
    });
    
    // Extraer IDs de amigos de las relaciones activas
    console.log('\n🔍 Extrayendo IDs de amigos...');
    const friendIds = [];
    for (const friendship of friendNetwork.friends) {
      console.log(`   Procesando amistad: Users=[${friendship.users.join(', ')}], Status=${friendship.status}`);
      
      if (friendship.status === 'active' && friendship.users && friendship.users.length > 0) {
        // Encontrar el ID del amigo (el que no es el usuario actual)
        const friendId = friendship.users.find(id => id !== userId);
        console.log(`   Usuario actual: ${userId}`);
        console.log(`   Amigo encontrado: ${friendId}`);
        
        if (friendId) {
          friendIds.push(friendId);
          console.log(`   ✅ Agregado a la lista: ${friendId}`);
        }
      } else {
        console.log(`   ❌ Amistad no activa o datos inválidos`);
      }
    }
    
    console.log(`\n📋 IDs de amigos extraídos: [${friendIds.join(', ')}]`);
    
    if (friendIds.length === 0) {
      console.log('❌ No se encontraron IDs de amigos válidos');
      return;
    }
    
    // Obtener información completa de los amigos desde PostgreSQL
    console.log('\n4️⃣ Buscando información de amigos en PostgreSQL...');
    console.log(`🔍 Buscando usuarios con IDs: [${friendIds.join(', ')}]`);
    
    const friends = await User.findAll({
      where: {
        id: { [Op.in]: friendIds }
      },
      attributes: ['id', 'username', 'fullName', 'email', 'profilePicture', 'createdAt']
    });
    
    console.log(`✅ Amigos encontrados en PostgreSQL: ${friends.length}`);
    friends.forEach((friend, index) => {
      console.log(`   ${index + 1}. ${friend.username} (${friend.fullName}) - ID: ${friend.id}`);
    });
    
    // Resultado final
    console.log('\n🎯 RESULTADO FINAL:');
    const result = {
      success: true,
      data: friends.map(friend => ({
        id: friend.id,
        username: friend.username,
        fullName: friend.fullName,
        email: friend.email,
        profilePicture: friend.profilePicture,
        createdAt: friend.createdAt
      }))
    };
    
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error en debug:', error);
  } finally {
    // Cerrar conexiones
    await mongoose.disconnect();
    await sequelize.close();
    console.log('\n🔚 Conexiones cerradas');
  }
}

// Ejecutar debug
debugFriendsController().then(() => {
  console.log('\n🏁 Debug completado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
