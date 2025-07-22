const { Category } = require('../models');
const { Op } = require('sequelize');

/**
 * Obtener todas las categorías
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getAllCategories = async (req, res) => {
  try {
    console.log('------ INICIO SOLICITUD DE CATEGORÍAS ------');
    console.log('Ruta original:', req.originalUrl);
    console.log('Método HTTP:', req.method);
    console.log('Headers:', req.headers);
    
    // Determinar si la petición viene de una ruta administrativa
    const isAdminRequest = req.originalUrl.includes('/admin/');
    console.log('¿Es solicitud de admin?', isAdminRequest);
    
    // Criterios de búsqueda - si es una solicitud de admin, mostrar todas las categorías
    const whereClause = isAdminRequest ? {} : { isActive: true };
    console.log('Filtros aplicados:', JSON.stringify(whereClause));
    
    const categories = await Category.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });
    
    console.log(`Encontradas ${categories.length} categorías`);
    console.log('Primeras 3 categorías:', JSON.stringify(categories.slice(0, 3)));
    
    const response = {
      success: true,
      data: categories
    };
    
    console.log('Estructura de respuesta:', Object.keys(response));
    console.log('Tipo de datos:', Array.isArray(response.data) ? 'Array' : typeof response.data);
    console.log('------ FIN SOLICITUD DE CATEGORÍAS ------');
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las categorías',
      error: error.message
    });
  }
};

/**
 * Obtener una categoría por ID
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findByPk(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error al obtener categoría:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la categoría',
      error: error.message
    });
  }
};

/**
 * Crear una nueva categoría
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.createCategory = async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    
    // Verificar si ya existe una categoría con el mismo nombre
    const existingCategory = await Category.findOne({
      where: {
        name: { [Op.iLike]: name }
      }
    });
    
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una categoría con este nombre'
      });
    }
    
    const newCategory = await Category.create({
      name,
      description,
      icon
    });
    
    return res.status(201).json({
      success: true,
      data: newCategory,
      message: 'Categoría creada exitosamente'
    });
  } catch (error) {
    console.error('Error al crear categoría:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la categoría',
      error: error.message
    });
  }
};

/**
 * Actualizar una categoría existente
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, isActive } = req.body;
    
    const category = await Category.findByPk(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Verificar si ya existe otra categoría con el mismo nombre
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        where: {
          name: { [Op.iLike]: name },
          id: { [Op.ne]: id }
        }
      });
      
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otra categoría con este nombre'
        });
      }
    }
    
    // Actualizar los campos
    await category.update({
      name: name || category.name,
      description: description !== undefined ? description : category.description,
      icon: icon || category.icon,
      isActive: isActive !== undefined ? isActive : category.isActive
    });
    
    return res.status(200).json({
      success: true,
      data: category,
      message: 'Categoría actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar la categoría',
      error: error.message
    });
  }
};

/**
 * Eliminar una categoría (desactivarla)
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findByPk(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // En lugar de eliminar, desactivamos la categoría
    await category.update({ isActive: false });
    
    return res.status(200).json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar la categoría',
      error: error.message
    });
  }
};
