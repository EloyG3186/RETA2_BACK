const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { mongoose } = require('../src/config/mongodb');
const { sequelize } = require('../src/config/database');
const { User } = require('../src/models');
const { FriendNetwork, FriendRequest, Friendship } = require('../src/models').mongoModels;

// Lista de usuarios de prueba
const testUsers = [
  { username: 'EloyG', email: 'eloyg@example.com', fullName: 'Eloy García', bio: 'Usuario principal' },
  { username: 'MariaS', email: 'marias@example.com', fullName: 'María Sánchez', bio: 'Amiga de Eloy' },
  { username: 'CarlosR', email: 'carlosr@example.com', fullName: 'Carlos Rodríguez', bio: 'Amigo de Eloy' },
  { username: 'LauraM', email: 'lauram@example.com', fullName: 'Laura Martínez', bio: 'Amiga de Eloy' },
  { username: 'JuanP', email: 'juanp@example.com', fullName: 'Juan Pérez', bio: 'Amigo de María' },
  { username: 'AnaSF', email: 'anasf@example.com', fullName: 'Ana San Feliz', bio: 'Amiga de María' },
  { username: 'RobertoL', email: 'robertol@example.com', fullName: 'Roberto López', bio: 'Amigo de Carlos' },
  { username: 'SofiaG', email: 'sofiag@example.com', fullName: 'Sofía González', bio: 'Amiga de Carlos' },
  { username: 'DiegoF', email: 'diegof@example.com', fullName: 'Diego Fernández', bio: 'Amigo de Laura' },
  { username: 'ElenaV', email: 'elenav@example.com', fullName: 'Elena Vázquez', bio: 'Amiga de Laura' },
  { username: 'AlejandroM', email: 'alejandrom@example.com', fullName: 'Alejandro Moreno', bio: 'Amigo de Juan' },
  { username: 'CristinaR', email: 'cristinar@example.com', fullName: 'Cristina Ruiz', bio: 'Amiga de Ana' },
  { username: 'PabloH', email: 'pabloh@example.com', fullName: 'Pablo Hernández', bio: 'Amigo de Roberto' },
  { username: 'LuciaB', email: 'luciab@example.com', fullName: 'Lucía Blanco', bio: 'Amiga de Sofía' },
  { username: 'MiguelT', email: 'miguelt@example.com', fullName: 'Miguel Torres', bio: 'Amigo de Diego' },
  { username: 'ClaraZ', email: 'claraz@example.com', fullName: 'Clara Zambrano', bio: 'Amiga de Elena' },
  { username: 'JavierD', email: 'javierd@example.com', fullName: 'Javier Domínguez', bio: 'Usuario activo' },
  { username: 'NuriaC', email: 'nuriac@example.com', fullName: 'Nuria Castro', bio: 'Usuario activo' },
  { username: 'HectorP', email: 'hectorp@example.com', fullName: 'Héctor Pascual', bio: 'Usuario activo' },
  { username: 'AliciaG', email: 'aliciag@example.com', fullName: 'Alicia Gómez', bio: 'Usuario activo' }
];

// Relaciones de amistad a establecer
// [usuarioA, usuarioB] significa que son amigos
const friendships = [
  ['EloyG', 'MariaS'],
  ['EloyG', 'CarlosR'],
  ['EloyG', 'LauraM'],
  ['MariaS', 'JuanP'],
  ['MariaS', 'AnaSF'],
  ['CarlosR', 'RobertoL'],
  ['CarlosR', 'SofiaG'],
  ['LauraM', 'DiegoF'],
  ['LauraM', 'ElenaV'],
  ['JuanP', 'AlejandroM'],
  ['AnaSF', 'CristinaR'],
  ['RobertoL', 'PabloH'],
  ['SofiaG', 'LuciaB'],
  ['DiegoF', 'MiguelT'],
  ['ElenaV', 'ClaraZ'],
  // Relaciones cruzadas para mayor riqueza en la red
  ['JuanP', 'SofiaG'],
  ['AnaSF', 'ElenaV'],
  ['RobertoL', 'AlejandroM'],
  ['DiegoF', 'CristinaR']
];

// Solicitudes de amistad pendientes
const pendingRequests = [
  ['EloyG', 'AlejandroM'], // EloyG ha enviado a AlejandroM
  ['CristinaR', 'EloyG'], // CristinaR ha enviado a EloyG
  ['JavierD', 'EloyG'] // JavierD ha enviado a EloyG
];

// Usuarios bloqueados
const blockedUsers = [
  ['EloyG', 'HectorP'] // EloyG ha bloqueado a HectorP
];

// Función para hashear contraseñas
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Función para crear usuarios en PostgreSQL
async function createPostgresUsers() {
  try {
    const hashedPassword = await hashPassword('password123');
    
    // Crear los usuarios
    for (const userData of testUsers) {
      const user = {
        id: uuidv4(),
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        fullName: userData.fullName,
        bio: userData.bio,
        isActive: true,
        profilePicture: `${userData.username.toLowerCase()}.jpg`,
        emailVerified: true
      };
      
      await User.create(user);
      console.log(`Usuario creado: ${userData.username}`);
    }
    
    console.log('Todos los usuarios PostgreSQL creados correctamente');
    return true;
  } catch (error) {
    console.error('Error al crear usuarios PostgreSQL:', error);
    return false;
  }
}

// Función para establecer relaciones de amistad en MongoDB
async function createMongoDbRelationships() {
  try {
    // Obtener todos los usuarios creados
    const pgUsers = await User.findAll();
    const userMap = {};
    
    // Crear un mapa de usuarios para búsqueda rápida por username
    pgUsers.forEach(user => {
      userMap[user.username] = user.id;
    });
    
    // Crear redes de amistad para cada usuario
    for (const username in userMap) {
      const userId = userMap[username];
      
      // Crear una red de amistad para cada usuario si no existe
      let friendNetwork = await FriendNetwork.findOne({ userId });
      
      if (!friendNetwork) {
        friendNetwork = await FriendNetwork.create({
          userId,
          friends: [],
          pendingRequests: [],
          sentRequests: [],
          blockedUsers: []
        });
        console.log(`Red de amistad creada para: ${username}`);
      }
    }
    
    // Establecer amistades
    for (const [userA, userB] of friendships) {
      if (!userMap[userA] || !userMap[userB]) {
        console.log(`Saltando amistad para ${userA}-${userB}: uno o ambos usuarios no existen`);
        continue;
      }
      
      // Crear la relación de amistad
      const friendship = await Friendship.create({
        users: [userMap[userA], userMap[userB]],
        status: 'active'
      });
      
      // Actualizar las redes de amistad de ambos usuarios
      await FriendNetwork.findOneAndUpdate(
        { userId: userMap[userA] },
        { $addToSet: { friends: friendship._id } }
      );
      
      await FriendNetwork.findOneAndUpdate(
        { userId: userMap[userB] },
        { $addToSet: { friends: friendship._id } }
      );
      
      console.log(`Amistad creada entre ${userA} y ${userB}`);
    }
    
    // Establecer solicitudes pendientes
    for (const [from, to] of pendingRequests) {
      if (!userMap[from] || !userMap[to]) {
        console.log(`Saltando solicitud para ${from}-${to}: uno o ambos usuarios no existen`);
        continue;
      }
      
      // Crear la solicitud de amistad
      const request = await FriendRequest.create({
        from: userMap[from],
        to: userMap[to],
        status: 'pending'
      });
      
      // Actualizar las redes de amistad
      await FriendNetwork.findOneAndUpdate(
        { userId: userMap[from] },
        { $addToSet: { sentRequests: request._id } }
      );
      
      await FriendNetwork.findOneAndUpdate(
        { userId: userMap[to] },
        { $addToSet: { pendingRequests: request._id } }
      );
      
      console.log(`Solicitud pendiente creada de ${from} a ${to}`);
    }
    
    // Establecer usuarios bloqueados
    for (const [user, blocked] of blockedUsers) {
      if (!userMap[user] || !userMap[blocked]) {
        console.log(`Saltando bloqueo para ${user}-${blocked}: uno o ambos usuarios no existen`);
        continue;
      }
      
      // Actualizar la red de amistad del usuario que bloquea
      await FriendNetwork.findOneAndUpdate(
        { userId: userMap[user] },
        { $addToSet: { blockedUsers: userMap[blocked] } }
      );
      
      console.log(`${user} ha bloqueado a ${blocked}`);
    }
    
    console.log('Todas las relaciones de MongoDB creadas correctamente');
    return true;
  } catch (error) {
    console.error('Error al crear relaciones MongoDB:', error);
    return false;
  }
}

// Función principal para ejecutar el script
async function main() {
  try {
    console.log('Iniciando población de datos de prueba...');
    
    // Crear usuarios PostgreSQL
    const pgUsersCreated = await createPostgresUsers();
    if (!pgUsersCreated) {
      console.error('No se pudieron crear los usuarios PostgreSQL. Abortando.');
      process.exit(1);
    }
    
    // Crear relaciones MongoDB
    const mongoRelationsCreated = await createMongoDbRelationships();
    if (!mongoRelationsCreated) {
      console.error('No se pudieron crear las relaciones MongoDB. Abortando.');
      process.exit(1);
    }
    
    console.log('¡Base de datos poblada exitosamente!');
    console.log('Sugerencias de amigos para EloyG ahora deberían incluir:');
    console.log('- Amigos de segundo grado: JuanP, AnaSF, RobertoL, SofiaG, DiegoF, ElenaV');
    console.log('- No deberían aparecer: AlejandroM, CristinaR, JavierD (solicitudes pendientes)');
    console.log('- No debería aparecer: HectorP (usuario bloqueado)');
    
    // Cerrar conexiones
    await mongoose.connection.close();
    await sequelize.close();
    
    process.exit(0);
  } catch (error) {
    console.error('Error al ejecutar el script:', error);
    process.exit(1);
  }
}

// Ejecutar el script
main();
