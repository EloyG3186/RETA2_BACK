const SystemConfig = require('../models/SystemConfig');

// Obtener todas las configuraciones del sistema
exports.getAllConfigs = async (req, res) => {
  try {
    const configs = await SystemConfig.findAll();
    res.status(200).json(configs);
  } catch (error) {
    console.error('Error al obtener configuraciones:', error);
    res.status(500).json({ message: 'Error al obtener configuraciones del sistema' });
  }
};

// Obtener configuraciones por categoría
exports.getConfigsByCategory = async (req, res) => {
  const { category } = req.params;
  try {
    const configs = await SystemConfig.findAll({
      where: { category }
    });
    res.status(200).json(configs);
  } catch (error) {
    console.error(`Error al obtener configuraciones de categoría ${category}:`, error);
    res.status(500).json({ message: 'Error al obtener configuraciones por categoría' });
  }
};

// Obtener configuración por clave
exports.getConfigByKey = async (req, res) => {
  const { key } = req.params;
  try {
    const config = await SystemConfig.findOne({
      where: { key }
    });
    
    if (!config) {
      return res.status(404).json({ message: `No se encontró la configuración con clave ${key}` });
    }
    
    res.status(200).json(config);
  } catch (error) {
    console.error(`Error al obtener configuración ${key}:`, error);
    res.status(500).json({ message: 'Error al obtener configuración por clave' });
  }
};

// Crear una nueva configuración
exports.createConfig = async (req, res) => {
  const { key, value, description, category } = req.body;
  
  try {
    // Verificar si la configuración ya existe
    const existingConfig = await SystemConfig.findOne({
      where: { key }
    });
    
    if (existingConfig) {
      return res.status(400).json({ message: `Ya existe una configuración con la clave ${key}` });
    }
    
    const newConfig = await SystemConfig.create({
      key,
      value,
      description,
      category
    });
    
    res.status(201).json(newConfig);
  } catch (error) {
    console.error('Error al crear configuración:', error);
    res.status(500).json({ message: 'Error al crear configuración del sistema' });
  }
};

// Actualizar una configuración existente
exports.updateConfig = async (req, res) => {
  const { id } = req.params;
  const { value, description, category } = req.body;
  
  try {
    const config = await SystemConfig.findByPk(id);
    
    if (!config) {
      return res.status(404).json({ message: 'Configuración no encontrada' });
    }
    
    // Actualizar solo los campos proporcionados
    await config.update({
      ...(value !== undefined && { value }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category })
    });
    
    res.status(200).json(config);
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ message: 'Error al actualizar configuración del sistema' });
  }
};

// Actualizar configuración por clave
exports.updateConfigByKey = async (req, res) => {
  const { key } = req.params;
  const { value, description, category } = req.body;
  
  try {
    const config = await SystemConfig.findOne({
      where: { key }
    });
    
    if (!config) {
      return res.status(404).json({ message: `No se encontró la configuración con clave ${key}` });
    }
    
    // Actualizar solo los campos proporcionados
    await config.update({
      ...(value !== undefined && { value }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category })
    });
    
    res.status(200).json(config);
  } catch (error) {
    console.error(`Error al actualizar configuración ${key}:`, error);
    res.status(500).json({ message: 'Error al actualizar configuración del sistema' });
  }
};

// Eliminar una configuración
exports.deleteConfig = async (req, res) => {
  const { id } = req.params;
  
  try {
    const config = await SystemConfig.findByPk(id);
    
    if (!config) {
      return res.status(404).json({ message: 'Configuración no encontrada' });
    }
    
    await config.destroy();
    res.status(200).json({ message: 'Configuración eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar configuración:', error);
    res.status(500).json({ message: 'Error al eliminar configuración del sistema' });
  }
};
