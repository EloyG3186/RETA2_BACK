const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Asegurar que el directorio de challenges exista
const challengeUploadDir = path.join(__dirname, '../../public/uploads/challenges');

// Mostrar información sobre el directorio
console.log('🗂️ Directorio de subidas de desafíos:', challengeUploadDir);
console.log('📁 ¿El directorio existe?', fs.existsSync(challengeUploadDir));

// Verificar permisos de escritura en el directorio
try {
  const testFile = path.join(challengeUploadDir, '.write-test');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log('✅ Permisos de escritura confirmados en el directorio de challenges');
} catch (error) {
  console.error('⛔ ERROR DE PERMISOS: No se puede escribir en el directorio de challenges:', error);
}

if (!fs.existsSync(challengeUploadDir)) {
  console.log('📂 Creando directorio de challenges...');
  try {
    fs.mkdirSync(challengeUploadDir, { recursive: true });
    console.log('✅ Directorio de challenges creado exitosamente');
    
    // Verificar que el directorio fue creado correctamente
    if (fs.existsSync(challengeUploadDir)) {
      console.log('✅ Verificación: directorio de challenges existe después de crearlo');
    } else {
      console.error('⚠️ ERROR: El directorio de challenges no existe después de intentar crearlo');
    }
  } catch (error) {
    console.error('⛔ Error al crear directorio de challenges:', error);
  }
}

// Configuración de almacenamiento para imágenes de desafíos
const challengeStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    console.log('📁 Guardando imagen de desafío en:', challengeUploadDir);
    cb(null, challengeUploadDir);
  },
  filename: function(req, file, cb) {
    // Generar un nombre único para el archivo basado en timestamp y nombre original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const filename = 'challenge-' + uniqueSuffix + fileExtension;
    
    console.log('📝 Generando nombre de archivo:', filename);
    console.log('📄 Archivo original:', file.originalname);
    console.log('📏 Tamaño del archivo:', file.size || 'desconocido');
    
    cb(null, filename);
  }
});

// Filtro para asegurar que solo se suban imágenes
const challengeFileFilter = (req, file, cb) => {
  console.log('🔍 Validando archivo:', file.originalname, 'Tipo:', file.mimetype);
  
  if (file.mimetype.startsWith('image/')) {
    console.log('✅ Archivo de imagen válido');
    cb(null, true);
  } else {
    console.log('❌ Archivo rechazado - no es una imagen');
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
};

// Limites para evitar archivos demasiado grandes
const challengeLimits = {
  fileSize: 5 * 1024 * 1024 // 5MB max
};

// Configuración de multer para desafíos
const challengeUpload = multer({
  storage: challengeStorage,
  fileFilter: challengeFileFilter,
  limits: challengeLimits
});

// Middleware para subir imagen de desafío
const uploadChallengeImage = (req, res, next) => {
  console.log('🖼️ [uploadChallengeImage] Iniciando subida de imagen de desafío...');
  
  const upload = challengeUpload.single('challengeImage');
  
  upload(req, res, (err) => {
    if (err) {
      console.error('❌ [uploadChallengeImage] Error en subida:', err);
      
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'El archivo es demasiado grande. Máximo 5MB.',
            code: 'FILE_TOO_LARGE'
          });
        }
      }
      
      return res.status(400).json({
        success: false,
        error: err.message || 'Error al subir la imagen',
        code: 'UPLOAD_ERROR'
      });
    }

    if (!req.file) {
      console.log('⚠️ [uploadChallengeImage] No se recibió archivo');
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ningún archivo',
        code: 'NO_FILE'
      });
    }

    console.log('✅ [uploadChallengeImage] Imagen subida exitosamente:');
    console.log('   📁 Directorio:', req.file.destination);
    console.log('   📄 Archivo:', req.file.filename);
    console.log('   📄 Original:', req.file.originalname);
    console.log('   📏 Tamaño:', req.file.size, 'bytes');
    console.log('   🔗 Ruta completa:', req.file.path);

    // Generar URL pública para la imagen
    const imageUrl = `/uploads/challenges/${req.file.filename}`;
    console.log('   🌐 URL pública:', imageUrl);

    // Agregar información de la imagen al request
    req.uploadedImage = {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path,
      url: imageUrl
    };

    next();
  });
};

module.exports = { 
  uploadChallengeImage,
  challengeUploadDir 
};
