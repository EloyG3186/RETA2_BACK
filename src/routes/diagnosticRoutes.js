const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Ruta para verificar si un archivo existe y devolver información sobre él
router.get('/check-file', (req, res) => {
  try {
    const { filepath } = req.query;
    
    // Medida de seguridad: no permitir atravesar directorios
    if (!filepath || filepath.includes('..')) {
      return res.status(400).json({
        success: false,
        message: 'Ruta de archivo inválida o insegura'
      });
    }

    // Construir rutas absolutas para diferentes posibilidades
    const publicPath = path.join(__dirname, '../../public', filepath);
    const uploadsPath = path.join(__dirname, '../../public/uploads', filepath);
    const avatarsPath = path.join(__dirname, '../../public/uploads/avatars', filepath);
    
    console.log('🔍 Verificando existencia de archivo:');
    console.log('- Ruta solicitada:', filepath);
    console.log('- Ruta pública:', publicPath, fs.existsSync(publicPath));
    console.log('- Ruta en uploads:', uploadsPath, fs.existsSync(uploadsPath));
    console.log('- Ruta en avatars:', avatarsPath, fs.existsSync(avatarsPath));
    
    let fileExists = false;
    let filePath = '';
    let fileSize = 0;
    
    // Verificar cada posibilidad
    if (fs.existsSync(publicPath)) {
      fileExists = true;
      filePath = publicPath;
      fileSize = fs.statSync(publicPath).size;
    } else if (fs.existsSync(uploadsPath)) {
      fileExists = true;
      filePath = uploadsPath;
      fileSize = fs.statSync(uploadsPath).size;
    } else if (fs.existsSync(avatarsPath)) {
      fileExists = true;
      filePath = avatarsPath;
      fileSize = fs.statSync(avatarsPath).size;
    }
    
    if (fileExists) {
      res.status(200).json({
        success: true,
        exists: true,
        path: filePath,
        size: fileSize,
        message: 'Archivo encontrado'
      });
    } else {
      res.status(404).json({
        success: false,
        exists: false,
        message: 'Archivo no encontrado en ninguna ubicación'
      });
    }
  } catch (error) {
    console.error('Error al verificar archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar archivo',
      error: error.message
    });
  }
});

// Listar archivos en un directorio específico
router.get('/list-files', (req, res) => {
  try {
    const { directory = 'avatars' } = req.query;
    
    // Medida de seguridad: limitar a directorios específicos
    const allowedDirectories = ['avatars', 'uploads', 'public'];
    if (!allowedDirectories.includes(directory)) {
      return res.status(400).json({
        success: false,
        message: 'Directorio no permitido'
      });
    }
    
    let dirPath;
    switch (directory) {
      case 'avatars':
        dirPath = path.join(__dirname, '../../public/uploads/avatars');
        break;
      case 'uploads':
        dirPath = path.join(__dirname, '../../public/uploads');
        break;
      case 'public':
        dirPath = path.join(__dirname, '../../public');
        break;
    }
    
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath).map(file => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      });
      
      res.status(200).json({
        success: true,
        directory: dirPath,
        fileCount: files.length,
        files
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Directorio no encontrado',
        path: dirPath
      });
    }
  } catch (error) {
    console.error('Error al listar archivos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar archivos',
      error: error.message
    });
  }
});

// Información sobre configuración de rutas estáticas
router.get('/static-config', (req, res) => {
  res.status(200).json({
    success: true,
    staticRoutes: [
      {
        route: '/uploads',
        directory: path.join(__dirname, '../../public/uploads'),
        exists: fs.existsSync(path.join(__dirname, '../../public/uploads'))
      },
      {
        route: '/uploads/avatars',
        directory: path.join(__dirname, '../../public/uploads/avatars'),
        exists: fs.existsSync(path.join(__dirname, '../../public/uploads/avatars'))
      }
    ]
  });
});

module.exports = router;
