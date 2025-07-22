const CategoryConfig = require('../models/CategoryConfig');
const Category = require('../models/Category');
const { Op } = require('sequelize');

// Obtener configuraciones de todas las categorías
exports.getAllCategoryConfigs = async (req, res) => {
  try {
    const configs = await CategoryConfig.findAll({
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'description', 'icon']
      }]
    });
    res.status(200).json(configs);
  } catch (error) {
    console.error('Error al obtener configuraciones de categorías:', error);
    res.status(500).json({ message: 'Error al obtener configuraciones de categorías' });
  }
};

// Obtener configuración de una categoría específica
exports.getCategoryConfig = async (req, res) => {
  const { categoryId } = req.params;
  
  try {
    const config = await CategoryConfig.findOne({
      where: { categoryId },
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'description', 'icon']
      }]
    });
    
    if (!config) {
      return res.status(404).json({ message: 'No se encontró configuración para esta categoría' });
    }
    
    res.status(200).json(config);
  } catch (error) {
    console.error(`Error al obtener configuración de categoría ${categoryId}:`, error);
    res.status(500).json({ message: 'Error al obtener configuración de categoría' });
  }
};

// Crear o actualizar configuración de categoría
exports.createOrUpdateCategoryConfig = async (req, res) => {
  const { categoryId, minBetAmount } = req.body;
  
  try {
    // Verificar que la categoría exista
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'La categoría no existe' });
    }
    
    // Buscar si ya existe configuración para esta categoría
    const [config, created] = await CategoryConfig.findOrCreate({
      where: { categoryId },
      defaults: { minBetAmount }
    });
    
    // Si ya existía, actualizar
    if (!created) {
      await config.update({ minBetAmount });
    }
    
    // Obtener la configuración actualizada con los datos de la categoría
    const updatedConfig = await CategoryConfig.findOne({
      where: { categoryId },
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'description', 'icon']
      }]
    });
    
    res.status(created ? 201 : 200).json(updatedConfig);
  } catch (error) {
    console.error('Error al crear/actualizar configuración de categoría:', error);
    res.status(500).json({ message: 'Error al crear/actualizar configuración de categoría' });
  }
};

// Actualizar configuración de una categoría específica
exports.updateCategoryConfig = async (req, res) => {
  const { categoryId } = req.params;
  const { minBetAmount, isActive } = req.body;
  
  try {
    const config = await CategoryConfig.findOne({
      where: { categoryId }
    });
    
    if (!config) {
      return res.status(404).json({ message: 'No se encontró configuración para esta categoría' });
    }
    
    // Actualizar solo los campos proporcionados
    await config.update({
      ...(minBetAmount !== undefined && { minBetAmount }),
      ...(isActive !== undefined && { isActive })
    });
    
    // Obtener la configuración actualizada con los datos de la categoría
    const updatedConfig = await CategoryConfig.findOne({
      where: { categoryId },
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'description', 'icon']
      }]
    });
    
    res.status(200).json(updatedConfig);
  } catch (error) {
    console.error(`Error al actualizar configuración de categoría ${categoryId}:`, error);
    res.status(500).json({ message: 'Error al actualizar configuración de categoría' });
  }
};

// Establecer montos mínimos para múltiples categorías
exports.bulkUpdateMinBets = async (req, res) => {
  console.log('📝 Recibida petición de actualización de montos mínimos:', JSON.stringify(req.body, null, 2));
  
  const { configUpdates } = req.body;
  
  if (!Array.isArray(configUpdates) || configUpdates.length === 0) {
    console.log('⚠️ Formato inválido: configUpdates no es un array o está vacío');
    return res.status(400).json({ message: 'Se requiere un array de actualizaciones' });
  }

  console.log(`🔄 Procesando actualización para ${configUpdates.length} categorías`);
  
  // Verificar tipos de datos antes de iniciar la transacción
  for (const update of configUpdates) {
    const { categoryId, minBetAmount } = update;
    
    if (!categoryId || typeof categoryId !== 'string') {
      console.error(`❌ categoryId inválido: ${categoryId}`, typeof categoryId);
      return res.status(400).json({
        message: 'categoryId debe ser un string válido',
        invalidData: update
      });
    }
    
    if (minBetAmount === undefined || isNaN(Number(minBetAmount))) {
      console.error(`❌ minBetAmount inválido: ${minBetAmount}`, typeof minBetAmount);
      return res.status(400).json({
        message: 'minBetAmount debe ser un número válido',
        invalidData: update
      });
    }
  }
  
  let transaction;
  try {
    transaction = await CategoryConfig.sequelize.transaction();
    console.log('🔄 Transacción iniciada');
    
    const results = [];
    
    for (const update of configUpdates) {
      const { categoryId, minBetAmount } = update;
      console.log(`🔄 Procesando categoría ${categoryId} con monto ${minBetAmount}`);
      
      // Verificar que la categoría exista
      const category = await Category.findByPk(categoryId, { transaction });
      if (!category) {
        console.error(`❌ La categoría con ID ${categoryId} no existe`);
        throw new Error(`La categoría con ID ${categoryId} no existe`);
      }
      console.log(`✅ Categoría ${categoryId} (${category.name}) encontrada`);
      
      try {
        // Crear o actualizar la configuración
        const [config, created] = await CategoryConfig.findOrCreate({
          where: { categoryId },
          defaults: { minBetAmount: Number(minBetAmount) },
          transaction
        });
        
        if (!created) {
          console.log(`🔄 Actualizando configuración existente para categoría ${categoryId}`);
          await config.update({ minBetAmount: Number(minBetAmount) }, { transaction });
        } else {
          console.log(`✅ Creada nueva configuración para categoría ${categoryId}`);
        }
        
        results.push({ categoryId, updated: true });
      } catch (configError) {
        console.error(`❌ Error al procesar configuración para ${categoryId}:`, configError);
        throw configError;
      }
    }
    
    await transaction.commit();
    console.log('✅ Transacción completada exitosamente');
    res.status(200).json({ message: 'Actualizaciones completadas', results });
  } catch (error) {
    console.error('❌ Error en actualización masiva de configuraciones:', error);
    if (transaction) {
      try {
        await transaction.rollback();
        console.log('🔄 Rollback de transacción completado');
      } catch (rollbackError) {
        console.error('❌ Error durante rollback:', rollbackError);
      }
    }
    
    res.status(500).json({ 
      message: 'Error al actualizar configuraciones de categorías', 
      error: error.message,
      stack: error.stack
    });
  }
};
