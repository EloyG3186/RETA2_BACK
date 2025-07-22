const path = require('path');
const fs = require('fs');
const { User } = require('../models');

// Función para eliminar un avatar anterior si existe y no es el default
const removeOldAvatar = async (filename) => {
  if (!filename || filename === 'default-profile.png') return;
  
  try {
    const avatarPath = path.join(__dirname, '../../public/uploads/avatars', filename);
    if (fs.existsSync(avatarPath)) {
      fs.unlinkSync(avatarPath);
      console.log(`Avatar anterior eliminado: ${filename}`);
    }
  } catch (error) {
    console.error('Error al eliminar avatar anterior:', error);
  }
};

// Subir avatar de usuario
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha subido ningún archivo'
      });
    }

    const userId = req.user.id;
    const avatarFilename = req.file.filename;
    
    // Obtener usuario actual para recuperar avatar anterior
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Eliminar avatar anterior si existe y no es el default
    const oldAvatar = user.profilePicture;
    if (oldAvatar && oldAvatar !== 'default-profile.png') {
      await removeOldAvatar(oldAvatar);
    }
    
    // Actualizar perfil con nuevo avatar
    await user.update({ profilePicture: avatarFilename });
    
    return res.status(200).json({
      success: true,
      message: 'Avatar actualizado con éxito',
      data: {
        profilePicture: avatarFilename,
        avatarUrl: `/uploads/avatars/${avatarFilename}`
      }
    });
  } catch (error) {
    console.error('Error al subir avatar:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al subir avatar',
      error: error.message
    });
  }
};

// Obtener avatar por nombre de archivo
exports.getAvatar = async (req, res) => {
  try {
    const { filename } = req.params;
    const avatarPath = path.join(__dirname, '../../public/uploads/avatars', filename);
    
    // Verificar si el archivo existe
    if (fs.existsSync(avatarPath)) {
      return res.sendFile(avatarPath);
    } else {
      // Si no existe, enviar avatar por defecto
      const defaultAvatarPath = path.join(__dirname, '../../public/uploads/avatars', 'default-profile.png');
      if (fs.existsSync(defaultAvatarPath)) {
        return res.sendFile(defaultAvatarPath);
      } else {
        return res.status(404).json({
          success: false,
          message: 'Avatar no encontrado'
        });
      }
    }
  } catch (error) {
    console.error('Error al obtener avatar:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener avatar',
      error: error.message
    });
  }
};
