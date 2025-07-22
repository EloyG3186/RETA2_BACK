const Testimonial = require('../../models/mongodb/Testimonial');

/**
 * Obtener testimonios de un usuario
 */
const getUserTestimonials = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const testimonials = await Testimonial.find({ targetUser: userId })
      .sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      data: testimonials
    });
  } catch (error) {
    console.error('Error al obtener testimonios del usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los testimonios',
      error: error.message
    });
  }
};

/**
 * Crear un nuevo testimonio
 */
const createTestimonial = async (req, res) => {
  try {
    const { targetUser, challengeId, content, rating, tags } = req.body;
    const userId = req.user.id;
    
    // Verificar que el usuario no se dé un testimonio a sí mismo
    if (targetUser === userId) {
      return res.status(400).json({
        success: false,
        message: 'No puedes crear un testimonio para ti mismo'
      });
    }
    
    // Verificar si ya existe un testimonio para este usuario y desafío
    if (challengeId) {
      const existingTestimonial = await Testimonial.findOne({
        author: userId,
        targetUser,
        challengeId
      });
      
      if (existingTestimonial) {
        return res.status(400).json({
          success: false,
          message: 'Ya has creado un testimonio para este usuario en este desafío'
        });
      }
    }
    
    // Crear el nuevo testimonio
    const newTestimonial = new Testimonial({
      author: userId,
      targetUser,
      challengeId: challengeId || null,
      content,
      rating,
      tags: tags || [],
      likes: []
    });
    
    await newTestimonial.save();
    
    return res.status(201).json({
      success: true,
      data: newTestimonial,
      message: 'Testimonio creado exitosamente'
    });
  } catch (error) {
    console.error('Error al crear testimonio:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear el testimonio',
      error: error.message
    });
  }
};

/**
 * Dar like a un testimonio
 */
const likeTestimonial = async (req, res) => {
  try {
    const { testimonialId } = req.params;
    const userId = req.user.id;
    
    const testimonial = await Testimonial.findById(testimonialId);
    
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
      await testimonial.save();
      
      return res.status(200).json({
        success: true,
        message: 'Like removido exitosamente'
      });
    } else {
      // Agregar el like
      testimonial.likes.push(userId);
      await testimonial.save();
      
      return res.status(200).json({
        success: true,
        message: 'Like agregado exitosamente'
      });
    }
  } catch (error) {
    console.error('Error al dar like a testimonio:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al dar like al testimonio',
      error: error.message
    });
  }
};

/**
 * Verificar un testimonio (solo para administradores)
 */
const verifyTestimonial = async (req, res) => {
  try {
    const { testimonialId } = req.params;
    
    // Verificar que el usuario sea administrador
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para verificar testimonios'
      });
    }
    
    const testimonial = await Testimonial.findById(testimonialId);
    
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonio no encontrado'
      });
    }
    
    testimonial.isVerified = true;
    await testimonial.save();
    
    return res.status(200).json({
      success: true,
      message: 'Testimonio verificado exitosamente'
    });
  } catch (error) {
    console.error('Error al verificar testimonio:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar el testimonio',
      error: error.message
    });
  }
};

module.exports = {
  getUserTestimonials,
  createTestimonial,
  likeTestimonial,
  verifyTestimonial
};
