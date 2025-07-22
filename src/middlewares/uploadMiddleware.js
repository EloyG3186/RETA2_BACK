const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Asegurar que el directorio exista
const uploadDir = path.join(__dirname, '../../public/uploads/avatars');

// Mostrar información sobre el directorio
console.log('🗂️ Directorio de subidas:', uploadDir);
console.log('📁 ¿El directorio existe?', fs.existsSync(uploadDir));

// Verificar permisos de escritura en el directorio
try {
  const testFile = path.join(uploadDir, '.write-test');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log('✅ Permisos de escritura confirmados en el directorio de subidas');
} catch (error) {
  console.error('⛔ ERROR DE PERMISOS: No se puede escribir en el directorio de subidas:', error);
}

if (!fs.existsSync(uploadDir)) {
  console.log('📂 Creando directorio de subidas...');
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('✅ Directorio creado exitosamente');
    
    // Verificar que el directorio fue creado correctamente
    if (fs.existsSync(uploadDir)) {
      console.log('✅ Verificación: directorio existe después de crearlo');
    } else {
      console.error('⚠️ ERROR: El directorio no existe después de intentar crearlo');
    }
  } catch (error) {
    console.error('⛔ Error al crear directorio:', error);
  }
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Generar un nombre único para el archivo basado en timestamp y nombre original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'avatar-' + uniqueSuffix + fileExtension);
  }
});

// Filtro para asegurar que solo se suban imágenes
const fileFilter = (req, file, cb) => {
  // Aceptar solo jpg, jpeg, png o gif
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
};

// Limites para evitar archivos demasiado grandes
const limits = {
  fileSize: 5 * 1024 * 1024 // 5MB max
};

// Crear middleware para campo 'avatar'
const uploadSingleAvatar = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: limits
}).single('avatar'); // 'avatar' es el nombre del campo en el formulario

// Crear middleware para campo 'profilePicture' por compatibilidad
const uploadSingleProfilePicture = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: limits
}).single('profilePicture'); // Alternativa para compatibilidad

// Middleware combinado que prueba ambos campos
const uploadAvatar = (req, res, next) => {
  console.log('⭐ Iniciando middleware de subida de avatar');
  console.log('📋 Campos en el cuerpo:', Object.keys(req.body));
  console.log('📄 Content-Type recibido:', req.headers['content-type']);

  // Listar los archivos existentes antes de la subida para comparación
  try {
    const existingFiles = fs.readdirSync(uploadDir);
    console.log(`📦 Archivos existentes antes de subida (${existingFiles.length}):`, existingFiles);
  } catch (error) {
    console.error('⚠️ No se pudo listar archivos existentes:', error);
  }

  // Primero intentamos con el campo 'avatar'
  uploadSingleAvatar(req, res, (err) => {
    if (err) {
      console.error('❌ Error al procesar campo avatar:', err);

      // Si falla, probamos con el campo 'profilePicture'
      uploadSingleProfilePicture(req, res, (err2) => {
        if (err2) {
          console.error('❌ Error al procesar campo profilePicture:', err2);
          // Si ambos fallan pero es un error de "campo inesperado", continuamos
          if (err.message && err.message.includes('Unexpected field') &&
              err2.message && err2.message.includes('Unexpected field')) {
            console.log('⚠️ No se encontraron campos de avatar, continuando...');
            return next();
          }
          return next(err2);
        }
        
        // Verificar que el archivo se guardó físicamente
        if (req.file) {
          console.log('✅ Archivo cargado desde campo profilePicture:', req.file);
          const fullPath = path.join(uploadDir, req.file.filename);
          if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            console.log(`✅ VERIFICADO: Archivo guardado en disco (${stats.size} bytes) en: ${fullPath}`);
          } else {
            console.error('⛔ ERROR CRÍTICO: El archivo no existe en disco después de la subida:', fullPath);
          }
        }
        next();
      });
    } else {
      if (req.file) {
        console.log('✅ Archivo cargado desde campo avatar:', req.file);
        
        // Verificar que el archivo se guardó físicamente
        const fullPath = path.join(uploadDir, req.file.filename);
        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          console.log(`✅ VERIFICADO: Archivo guardado en disco (${stats.size} bytes) en: ${fullPath}`);
          
          // Listar archivos después de la subida para confirmar cambios
          try {
            const updatedFiles = fs.readdirSync(uploadDir);
            console.log(`📦 Archivos después de subida (${updatedFiles.length}):`, updatedFiles);
          } catch (error) {
            console.error('⚠️ No se pudo listar archivos actualizados:', error);
          }
        } else {
          console.error('⛔ ERROR CRÍTICO: El archivo no existe en disco después de la subida:', fullPath);
        }
      } else {
        console.log('⚠️ No se encontró archivo en campo avatar');
      }
      next();
    }
  });
};

module.exports = { uploadAvatar };
