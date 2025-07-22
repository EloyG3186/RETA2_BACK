# RETA2 - Backend

Backend para la aplicación Challenge Friends, una plataforma para crear y participar en competencias deportivas con amigos.

## Tecnologías Utilizadas

- Node.js
- Express.js
- PostgreSQL
- Sequelize ORM
- JWT para autenticación

## Estructura del Proyecto

El proyecto sigue una arquitectura Modelo-Vista-Controlador (MVC):

```
challenge-friends-backend/
├── src/
│   ├── config/           # Configuración de la base de datos y otras configuraciones
│   ├── controllers/      # Controladores para manejar la lógica de negocio
│   ├── middlewares/      # Middlewares para autenticación y validación
│   ├── models/           # Modelos de datos (Sequelize)
│   ├── routes/           # Rutas de la API
│   ├── utils/            # Utilidades y funciones auxiliares
│   └── index.js          # Punto de entrada de la aplicación
├── .env                  # Variables de entorno
├── .env.example         # Ejemplo de variables de entorno
└── package.json         # Dependencias y scripts
```

## Modelos de Datos

1. **User**: Información de usuarios
2. **Wallet**: Billetera digital de los usuarios
3. **Transaction**: Transacciones financieras
4. **Challenge**: Competencias deportivas
5. **Participant**: Participantes en las competencias
6. **Comment**: Comentarios en las competencias

## Instalación y Configuración

### Prerrequisitos

- Node.js (v14 o superior)
- PostgreSQL (v12 o superior)

### Pasos de Instalación

1. Clonar el repositorio:
   ```
   git clone <url-del-repositorio>
   cd challenge-friends-backend
   ```

2. Instalar dependencias:
   ```
   npm install
   ```

3. Configurar variables de entorno:
   - Copiar el archivo `.env.example` a `.env`
   - Modificar las variables según la configuración local

4. Crear la base de datos en PostgreSQL:
   ```
   createdb challenge_duel_db
   ```

5. Inicializar la base de datos con datos de ejemplo (opcional):
   ```
   node src/utils/seedDatabase.js
   ```

6. Iniciar el servidor:
   ```
   npm start
   ```

## API Endpoints

### Usuarios

- `POST /api/users/register` - Registrar un nuevo usuario
- `POST /api/users/login` - Iniciar sesión
- `GET /api/users/profile` - Obtener perfil del usuario (requiere autenticación)
- `PUT /api/users/profile` - Actualizar perfil del usuario (requiere autenticación)
- `PUT /api/users/change-password` - Cambiar contraseña (requiere autenticación)

### Competencias

- `GET /api/challenges` - Obtener todas las competencias (con filtros opcionales)
- `GET /api/challenges/:id` - Obtener una competencia por ID
- `POST /api/challenges` - Crear una nueva competencia (requiere autenticación)
- `PUT /api/challenges/:id` - Actualizar una competencia (requiere autenticación)
- `POST /api/challenges/:id/join` - Unirse a una competencia (requiere autenticación)
- `POST /api/challenges/:id/winner` - Determinar ganador de una competencia (requiere autenticación)

### Billetera

- `GET /api/wallet` - Obtener billetera del usuario (requiere autenticación)
- `GET /api/wallet/transactions` - Obtener historial de transacciones (requiere autenticación)
- `POST /api/wallet/deposit` - Realizar un depósito (requiere autenticación)
- `POST /api/wallet/withdraw` - Realizar un retiro (requiere autenticación)
- `POST /api/wallet/transfer` - Realizar una transferencia a otro usuario (requiere autenticación)

## Desarrollo

Para ejecutar el servidor en modo desarrollo con recarga automática:

```
npm run dev
```

## Licencia

Este proyecto es parte de una tesis académica y está sujeto a las políticas de la institución educativa correspondiente.
