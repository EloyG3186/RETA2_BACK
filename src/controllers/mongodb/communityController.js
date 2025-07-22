const Community = require('../../models/mongodb/Community');

/**
 * Obtener todas las comunidades públicas
 */
const getPublicCommunities = async (req, res) => {
  try {
    const communities = await Community.find({ isPrivate: false })
      .select('name description imageUrl coverImageUrl members tags createdAt')
      .sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      data: communities
    });
  } catch (error) {
    console.error('Error al obtener comunidades públicas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las comunidades',
      error: error.message
    });
  }
};

/**
 * Obtener comunidades a las que pertenece el usuario
 */
const getUserCommunities = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const communities = await Community.find({
      'members.userId': userId,
      'members.status': 'active'
    }).sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      data: communities
    });
  } catch (error) {
    console.error('Error al obtener comunidades del usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las comunidades',
      error: error.message
    });
  }
};

/**
 * Obtener una comunidad específica
 */
const getCommunityById = async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.id;
    
    const community = await Community.findById(communityId);
    
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Comunidad no encontrada'
      });
    }
    
    // Si la comunidad es privada, verificar que el usuario sea miembro
    if (community.isPrivate) {
      const isMember = community.members.some(
        member => member.userId === userId && member.status === 'active'
      );
      
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para acceder a esta comunidad privada'
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      data: community
    });
  } catch (error) {
    console.error('Error al obtener comunidad:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la comunidad',
      error: error.message
    });
  }
};

/**
 * Crear una nueva comunidad
 */
const createCommunity = async (req, res) => {
  try {
    const { name, description, isPrivate, tags, rules, imageUrl, coverImageUrl } = req.body;
    const userId = req.user.id;
    
    // Verificar si ya existe una comunidad con el mismo nombre
    const existingCommunity = await Community.findOne({ name });
    if (existingCommunity) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una comunidad con ese nombre'
      });
    }
    
    // Crear la nueva comunidad
    const newCommunity = new Community({
      name,
      description,
      createdBy: userId,
      isPrivate: isPrivate || false,
      tags: tags || [],
      rules: rules || [],
      imageUrl: imageUrl || null,
      coverImageUrl: coverImageUrl || null,
      inviteCode: isPrivate ? Math.random().toString(36).substring(2, 10).toUpperCase() : null,
      members: [{
        userId,
        role: 'admin',
        joinedAt: new Date(),
        status: 'active'
      }],
      posts: []
    });
    
    await newCommunity.save();
    
    return res.status(201).json({
      success: true,
      data: newCommunity,
      message: 'Comunidad creada exitosamente'
    });
  } catch (error) {
    console.error('Error al crear comunidad:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la comunidad',
      error: error.message
    });
  }
};

/**
 * Unirse a una comunidad
 */
const joinCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { inviteCode } = req.body;
    const userId = req.user.id;
    
    const community = await Community.findById(communityId);
    
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Comunidad no encontrada'
      });
    }
    
    // Verificar si el usuario ya es miembro
    const existingMember = community.members.find(member => member.userId === userId);
    if (existingMember) {
      if (existingMember.status === 'active') {
        return res.status(400).json({
          success: false,
          message: 'Ya eres miembro de esta comunidad'
        });
      } else if (existingMember.status === 'banned') {
        return res.status(403).json({
          success: false,
          message: 'Has sido baneado de esta comunidad'
        });
      } else {
        // Actualizar estado a activo si estaba inactivo
        existingMember.status = 'active';
        existingMember.joinedAt = new Date();
      }
    } else {
      // Si la comunidad es privada, verificar el código de invitación
      if (community.isPrivate) {
        if (!inviteCode || inviteCode !== community.inviteCode) {
          return res.status(403).json({
            success: false,
            message: 'Código de invitación inválido'
          });
        }
      }
      
      // Agregar al usuario como miembro
      community.members.push({
        userId,
        role: 'member',
        joinedAt: new Date(),
        status: 'active'
      });
    }
    
    await community.save();
    
    return res.status(200).json({
      success: true,
      message: 'Te has unido a la comunidad exitosamente'
    });
  } catch (error) {
    console.error('Error al unirse a la comunidad:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al unirse a la comunidad',
      error: error.message
    });
  }
};

/**
 * Crear una publicación en la comunidad
 */
const createPost = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { content, attachments } = req.body;
    const userId = req.user.id;
    
    const community = await Community.findById(communityId);
    
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Comunidad no encontrada'
      });
    }
    
    // Verificar que el usuario sea miembro activo
    const isMember = community.members.some(
      member => member.userId === userId && member.status === 'active'
    );
    
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'No eres miembro de esta comunidad'
      });
    }
    
    // Crear la nueva publicación
    const newPost = {
      author: userId,
      content,
      attachments: attachments || [],
      likes: [],
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    community.posts.push(newPost);
    await community.save();
    
    return res.status(201).json({
      success: true,
      data: newPost,
      message: 'Publicación creada exitosamente'
    });
  } catch (error) {
    console.error('Error al crear publicación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la publicación',
      error: error.message
    });
  }
};

module.exports = {
  getPublicCommunities,
  getUserCommunities,
  getCommunityById,
  createCommunity,
  joinCommunity,
  createPost
};
