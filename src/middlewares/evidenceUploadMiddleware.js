const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de almacenamiento para evidencias
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // Obtener el ID del desafío desde los parámetros de la ruta
      const challengeId = req.params.challengeId || req.params.id;
      
      if (!challengeId) {
        return cb(new Error('ID de desafío no proporcionado'), null);
      }

      // Crear la estructura de carpetas: /public/uploads/evidences/{challengeId}/
      const baseDir = path.join(__dirname, '../../public/uploads');
      const evidencesDir = path.join(baseDir, 'evidences');
      const challengeDir = path.join(evidencesDir, challengeId);

      // Crear las carpetas si no existen
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }
      
      if (!fs.existsSync(evidencesDir)) {
        fs.mkdirSync(evidencesDir, { recursive: true });
      }
      
      if (!fs.existsSync(challengeDir)) {
        fs.mkdirSync(challengeDir, { recursive: true });
      }

      console.log(`📁 [evidenceUpload] Directorio de evidencias creado/verificado: ${challengeDir}`);
      cb(null, challengeDir);
    } catch (error) {
      console.error('❌ [evidenceUpload] Error al crear directorio:', error);
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    try {
      // Generar nombre único: evidence-{timestamp}-{random}.{extension}
      const timestamp = Date.now();
      const randomNum = Math.floor(Math.random() * 1000000);
      const extension = path.extname(file.originalname);
      const filename = `evidence-${timestamp}-${randomNum}${extension}`;
      
      console.log(`📄 [evidenceUpload] Nombre de archivo generado: ${filename}`);
      cb(null, filename);
    } catch (error) {
      console.error('❌ [evidenceUpload] Error al generar nombre de archivo:', error);
      cb(error, null);
    }
  }
});

// Filtro de archivos para evidencias
const fileFilter = (req, file, cb) => {
  console.log(`🔍 [evidenceUpload] Validando archivo: ${file.originalname}`);
  console.log(`🔍 [evidenceUpload] Tipo MIME: ${file.mimetype}`);
  
  // Permitir imágenes y documentos comunes
  const allowedTypes = [
    // Imágenes
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    // Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Videos (opcional)
    'video/mp4',
    'video/mpeg',
    'video/quicktime'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    console.log(`✅ [evidenceUpload] Archivo aceptado: ${file.originalname}`);
    cb(null, true);
  } else {
    console.log(`❌ [evidenceUpload] Archivo rechazado: ${file.originalname} (tipo: ${file.mimetype})`);
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
  }
};

// Configuración de multer para evidencias
const uploadEvidence = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo
    files: 1 // Solo un archivo por vez
  }
}).single('evidence'); // El campo debe llamarse 'evidence'

// Middleware wrapper con manejo de errores
const evidenceUploadMiddleware = (req, res, next) => {
  console.log(`🚀 [evidenceUpload] Iniciando subida de evidencia para desafío: ${req.params.challengeId || req.params.id}`);
  
  uploadEvidence(req, res, (err) => {
    if (err) {
      console.error('❌ [evidenceUpload] Error en subida:', err);
      
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'El archivo es demasiado grande. Máximo 50MB permitido.',
            code: 'FILE_TOO_LARGE'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            error: 'Solo se permite un archivo por evidencia.',
            code: 'TOO_MANY_FILES'
          });
        }
      }
      
      return res.status(400).json({
        success: false,
        error: err.message || 'Error al subir la evidencia',
        code: 'UPLOAD_ERROR'
      });
    }
    
    if (!req.file) {
      console.log('⚠️ [evidenceUpload] No se recibió archivo');
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ningún archivo de evidencia',
        code: 'NO_FILE'
      });
    }
    
    console.log(`✅ [evidenceUpload] Evidencia subida exitosamente: ${req.file.filename}`);
    console.log(`📁 [evidenceUpload] Ubicación: ${req.file.path}`);
    
    // Agregar información adicional al request para el controlador
    const challengeId = req.params.challengeId || req.params.id;
    req.evidenceFile = {
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: `/uploads/evidences/${challengeId}/${req.file.filename}`
    };
    
    console.log(`🔗 [evidenceUpload] URL generada: ${req.evidenceFile.url}`);
    console.log(`📁 [evidenceUpload] Ruta física: ${req.file.path}`);
    
    next();
  });
};

module.exports = { evidenceUploadMiddleware };
