const Community = require('../models/mongodb/Community');

// Obtener todas las comunidades públicas
exports.getPublicCommunities = async (req, res) => {
  try {
    // Buscar todas las comunidades públicas
    const communities = await Community.find({
      isPrivate: false
    }).sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      data: communities
    });
  } catch (error) {
    console.error('Error al obtener comunidades públicas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener comunidades',
      error: error.message
    });
  }
};

// Obtener comunidades a las que pertenece el usuario
exports.getUserCommunities = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Buscar todas las comunidades donde el usuario es miembro
    const communities = await Community.find({
      'members.userId': userId,
      'members.status': 'active'
    }).sort({ lastActivity: -1 });
    
    return res.status(200).json({
      success: true,
      data: communities
    });
  } catch (error) {
    console.error('Error al obtener comunidades del usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener comunidades',
      error: error.message
    });
  }
};

// Obtener una comunidad específica
exports.getCommunityById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Buscar la comunidad
    const community = await Community.findById(id);
    
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Comunidad no encontrada'
      });
    }
    
    // Si la comunidad es privada, verificar que el usuario es miembro
    if (community.isPrivate) {
      const isMember = community.members.some(member => 
        member.userId === userId && member.status === 'active'
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
      message: 'Error al obtener comunidad',
      error: error.message
    });
  }
};

// Crear una nueva comunidad
exports.createCommunity = async (req, res) => {
  try {
    const { name, description, isPrivate, tags, rules, imageUrl, coverImageUrl } = req.body;
    const userId = req.user.id;
    
    // Crear la nueva comunidad
    const newCommunity = new Community({
      name,
      description,
      createdBy: userId,
      imageUrl,
      coverImageUrl,
      members: [{
        userId,
        role: 'admin',
        joinedAt: new Date(),
        status: 'active'
      }],
      posts: [],
      rules: rules || [],
      isPrivate: isPrivate || false,
      inviteCode: isPrivate ? Math.random().toString(36).substring(2, 10) : undefined,
      tags: tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newCommunity.save();
    
    return res.status(201).json({
      success: true,
      message: 'Comunidad creada con éxito',
      data: newCommunity
    });
  } catch (error) {
    console.error('Error al crear comunidad:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear comunidad',
      error: error.message
    });
  }
};

// Unirse a una comunidad
exports.joinCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const { inviteCode } = req.body;
    const userId = req.user.id;
    
    // Buscar la comunidad
    const community = await Community.findById(id);
    
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
          message: 'Has sido expulsado de esta comunidad'
        });
      } else {
        // Reactivar miembro inactivo
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
      
      // Añadir al usuario como miembro
      community.members.push({
        userId,
        role: 'member',
        joinedAt: new Date(),
        status: 'active'
      });
    }
    
    community.updatedAt = new Date();
    await community.save();
    
    return res.status(200).json({
      success: true,
      message: 'Te has unido a la comunidad con éxito',
      data: community
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

// Crear una publicación en la comunidad
exports.createPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, attachments } = req.body;
    const userId = req.user.id;
    
    // Buscar la comunidad
    const community = await Community.findById(id);
    
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Comunidad no encontrada'
      });
    }
    
    // Verificar que el usuario es miembro activo
    const isMember = community.members.some(member => 
      member.userId === userId && member.status === 'active'
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
    
    // Añadir la publicación a la comunidad
    community.posts.push(newPost);
    community.updatedAt = new Date();
    
    await community.save();
    
    return res.status(201).json({
      success: true,
      message: 'Publicación creada con éxito',
      data: newPost
    });
  } catch (error) {
    console.error('Error al crear publicación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear publicación',
      error: error.message
    });
  }
};
