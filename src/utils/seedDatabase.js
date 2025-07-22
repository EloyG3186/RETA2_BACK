const { sequelize } = require('../config/database');
const { User, Wallet, Challenge, Participant } = require('../models');
const bcrypt = require('bcrypt');

async function seedDatabase() {
  try {
    // Sincronizar modelos con la base de datos (esto crearu00e1 las tablas)
    await sequelize.sync({ force: true });
    console.log('Base de datos sincronizada y tablas creadas');

    // Crear usuarios de ejemplo
    const users = await User.bulkCreate([
      {
        username: 'admin',
        email: 'admin@challengefriends.com',
        password: await bcrypt.hash('admin123', 10),
        fullName: 'Administrador',
        role: 'admin',
        bio: 'Administrador de la plataforma Challenge Friends',
        isActive: true
      },
      {
        username: 'eloy',
        email: 'eloy@example.com',
        password: await bcrypt.hash('password123', 10),
        fullName: 'Eloy Gonzu00e1lez',
        role: 'user',
        bio: 'Apasionado por los deportes y la tecnologu00eda',
        isActive: true
      },
      {
        username: 'maria',
        email: 'maria@example.com',
        password: await bcrypt.hash('password123', 10),
        fullName: 'Maru00eda Pu00e9rez',
        role: 'user',
        bio: 'Deportista profesional',
        isActive: true
      },
      {
        username: 'carlos',
        email: 'carlos@example.com',
        password: await bcrypt.hash('password123', 10),
        fullName: 'Carlos Rodru00edguez',
        role: 'user',
        bio: 'Entusiasta del fu00fatbol y las competencias',
        isActive: true
      }
    ]);
    console.log(`${users.length} usuarios creados`);

    // Crear billeteras para cada usuario
    const wallets = [];
    for (const user of users) {
      const wallet = await Wallet.create({
        userId: user.id,
        balance: 1000.00, // Saldo inicial para pruebas
        currency: 'USD',
        isActive: true
      });
      wallets.push(wallet);
    }
    console.log(`${wallets.length} billeteras creadas`);

    // Crear competencias de ejemplo
    const challenges = await Challenge.bulkCreate([
      {
        title: 'Maratu00f3n 10K',
        description: 'Carrera de 10 kilu00f3metros en el parque central',
        creatorId: users[1].id, // Eloy
        category: 'Running',
        startDate: new Date(2025, 3, 20), // 20 de abril de 2025
        endDate: new Date(2025, 3, 20),
        location: 'Parque Central',
        entryFee: 50.00,
        prize: 500.00,
        maxParticipants: 20,
        status: 'active',
        isPrivate: false,
        imageUrl: 'https://example.com/images/marathon.jpg'
      },
      {
        title: 'Torneo de Fu00fatbol 5vs5',
        description: 'Torneo de fu00fatbol 5 contra 5 en el complejo deportivo',
        creatorId: users[2].id, // Maru00eda
        category: 'Team',
        startDate: new Date(2025, 4, 15), // 15 de mayo de 2025
        endDate: new Date(2025, 4, 16),
        location: 'Complejo Deportivo Norte',
        entryFee: 100.00,
        prize: 1000.00,
        maxParticipants: 10,
        status: 'pending',
        isPrivate: false,
        imageUrl: 'https://example.com/images/soccer.jpg'
      },
      {
        title: 'Desafu00edo de Ciclismo',
        description: 'Recorrido de 50 kilu00f3metros por la montau00f1a',
        creatorId: users[3].id, // Carlos
        category: 'Endurance',
        startDate: new Date(2025, 5, 10), // 10 de junio de 2025
        endDate: new Date(2025, 5, 10),
        location: 'Ruta de Montau00f1a',
        entryFee: 75.00,
        prize: 750.00,
        maxParticipants: 30,
        status: 'active',
        isPrivate: false,
        imageUrl: 'https://example.com/images/cycling.jpg'
      }
    ]);
    console.log(`${challenges.length} competencias creadas`);

    // Crear participantes para las competencias
    const participants = [];
    
    // Participantes para la Maratu00f3n 10K
    participants.push(await Participant.create({
      userId: users[2].id, // Maru00eda
      challengeId: challenges[0].id,
      status: 'accepted',
      paymentStatus: 'paid'
    }));
    
    participants.push(await Participant.create({
      userId: users[3].id, // Carlos
      challengeId: challenges[0].id,
      status: 'accepted',
      paymentStatus: 'paid'
    }));
    
    // Participantes para el Torneo de Fu00fatbol
    participants.push(await Participant.create({
      userId: users[1].id, // Eloy
      challengeId: challenges[1].id,
      status: 'accepted',
      paymentStatus: 'paid'
    }));
    
    // Participantes para el Desafu00edo de Ciclismo
    participants.push(await Participant.create({
      userId: users[1].id, // Eloy
      challengeId: challenges[2].id,
      status: 'accepted',
      paymentStatus: 'paid'
    }));
    
    participants.push(await Participant.create({
      userId: users[2].id, // Maru00eda
      challengeId: challenges[2].id,
      status: 'accepted',
      paymentStatus: 'paid'
    }));
    
    console.log(`${participants.length} participantes creados`);

    console.log('Base de datos poblada exitosamente');
  } catch (error) {
    console.error('Error al poblar la base de datos:', error);
  } finally {
    // Cerrar la conexiu00f3n
    await sequelize.close();
  }
}

// Ejecutar la funciu00f3n para poblar la base de datos
seedDatabase();
