const { Client } = require('pg');
require('dotenv').config();

// Configuraciu00f3n para conectarse al servidor PostgreSQL
const config = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  // No especificamos la base de datos porque queremos conectarnos al servidor, no a una base de datos especu00edfica
};

// Nombre de la base de datos que queremos crear
const dbName = process.env.DB_NAME || 'challenge_friends_db';

async function createDatabase() {
  // Cliente para conectarse al servidor PostgreSQL
  const client = new Client(config);
  
  try {
    // Conectar al servidor PostgreSQL
    await client.connect();
    console.log('Conectado al servidor PostgreSQL');
    
    // Verificar si la base de datos ya existe
    const checkDbQuery = `SELECT 1 FROM pg_database WHERE datname = '${dbName}'`;
    const checkResult = await client.query(checkDbQuery);
    
    if (checkResult.rows.length === 0) {
      // La base de datos no existe, asu00ed que la creamos
      console.log(`Creando base de datos: ${dbName}`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Base de datos ${dbName} creada exitosamente`);
    } else {
      console.log(`La base de datos ${dbName} ya existe`);
    }
    
  } catch (error) {
    console.error('Error al crear la base de datos:', error);
  } finally {
    // Cerrar la conexiu00f3n
    await client.end();
    console.log('Conexiu00f3n cerrada');
  }
}

// Ejecutar la funciu00f3n para crear la base de datos
createDatabase();
