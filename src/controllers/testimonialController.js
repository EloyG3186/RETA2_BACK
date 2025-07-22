const Testimonial = require('../models/mongodb/Testimonial');
const { User } = require('../models');

// Obtener testimonios de un usuario
exports.getUserTestimonials = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Buscar todos los testimonios dirigidos al usuario
    const testimonials = await Testimonial.find({
      targetUser: userId
    }).sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      data: testimonials
    });
  } catch (error) {
    console.error('Error al obtener testimonios del usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener testimonios',
      error: error.message
    });
  }
};

// Crear un nuevo testimonio
exports.createTestimonial = async (req, res) => {
  try {
    const { targetUser, challengeId, content, rating, tags } = req.body;
    const userId = req.user.id;
    
    // Verificar que el usuario objetivo existe
    const userExists = await User.findByPk(targetUser);
    
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: 'Usuario objetivo no encontrado'
      });
    }
    
    // Verificar que el usuario no está creando un testimonio para sí mismo
    if (userId === targetUser) {
      return res.status(400).json({
        success: false,
        message: 'No puedes crear un testimonio para ti mismo'
      });
    }
    
    // Crear el nuevo testimonio
    const newTestimonial = new Testimonial({
      author: userId,
      targetUser,
      challengeId,
      content,
      rating: Math.min(Math.max(rating, 1), 5), // Asegurar que el rating esté entre 1 y 5
      isVerified: false,
      tags: tags || [],
      likes: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newTestimonial.save();
    
    return res.status(201).json({
      success: true,
      message: 'Testimonio creado con éxito',
      data: newTestimonial
    });
  } catch (error) {
    console.error('Error al crear testimonio:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear testimonio',
      error: error.message
    });
  }
};

// Dar like a un testimonio
exports.likeTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Buscar el testimonio
    const testimonial = await Testimonial.findById(id);
    
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonio no encontrado'
      });
    }
    
    // Verificar si el usuario ya dio like
    const alreadyLiked = testimonial.likes.includes(userId);
    
    if (alreadyLiked) {
      // Quitar el like
      testimonial.likes = testimonial.likes.filter(id => id !== userId);
    } else {
      // Añadir el like
      testimonial.likes.push(userId);
    }
    
    testimonial.updatedAt = new Date();
    await testimonial.save();
    
    return res.status(200).json({
      success: true,
      message: alreadyLiked ? 'Like removido con éxito' : 'Like añadido con éxito',
      data: testimonial
    });
  } catch (error) {
    console.error('Error al dar like a testimonio:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al dar like a testimonio',
      error: error.message
    });
  }
};

// Verificar un testimonio (solo para administradores)
exports.verifyTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verificar que el usuario es administrador
    const user = await User.findByPk(userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden verificar testimonios'
      });
    }
    
    // Buscar el testimonio
    const testimonial = await Testimonial.findById(id);
    
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonio no encontrado'
      });
    }
    
    // Marcar como verificado
    testimonial.isVerified = true;
    testimonial.updatedAt = new Date();
    
    await testimonial.save();
    
    return res.status(200).json({
      success: true,
      message: 'Testimonio verificado con éxito',
      data: testimonial
    });
  } catch (error) {
    console.error('Error al verificar testimonio:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar testimonio',
      error: error.message
    });
  }
};
