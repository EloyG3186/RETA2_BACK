const express = require('express');
const router = express.Router();
const systemConfigController = require('../controllers/systemConfigController');
const categoryConfigController = require('../controllers/categoryConfigController');
const categoryController = require('../controllers/categoryController');
const userAdminController = require('../controllers/userAdminController');
const { authenticate } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/adminMiddleware');

// Rutas de configuración del sistema
router.get('/system-configs', authenticate, isAdmin, systemConfigController.getAllConfigs);
router.get('/system-configs/category/:category', authenticate, isAdmin, systemConfigController.getConfigsByCategory);
router.get('/system-configs/:key', authenticate, isAdmin, systemConfigController.getConfigByKey);
router.post('/system-configs', authenticate, isAdmin, systemConfigController.createConfig);
router.put('/system-configs/:id', authenticate, isAdmin, systemConfigController.updateConfig);
router.put('/system-configs/key/:key', authenticate, isAdmin, systemConfigController.updateConfigByKey);
router.delete('/system-configs/:id', authenticate, isAdmin, systemConfigController.deleteConfig);

// Rutas para configuraciones de categorías
router.get('/category-configs', authenticate, isAdmin, categoryConfigController.getAllCategoryConfigs);
router.get('/category-configs/:categoryId', authenticate, isAdmin, categoryConfigController.getCategoryConfig);
router.post('/category-configs', authenticate, isAdmin, categoryConfigController.createOrUpdateCategoryConfig);
router.put('/category-configs/:categoryId', authenticate, isAdmin, categoryConfigController.updateCategoryConfig);
router.post('/category-configs/bulk-update', authenticate, isAdmin, categoryConfigController.bulkUpdateMinBets);

// Rutas para administrar categorías
router.get('/categories', authenticate, isAdmin, categoryController.getAllCategories); // Reutilizando controlador existente
router.post('/categories', authenticate, isAdmin, categoryController.createCategory); // Reutilizando controlador existente
router.put('/categories/:id', authenticate, isAdmin, categoryController.updateCategory);
router.delete('/categories/:id', authenticate, isAdmin, categoryController.deleteCategory);

// Rutas para administración de usuarios
const isDev = process.env.NODE_ENV === 'development';
console.log(`🔍 Configurando rutas de administración de usuarios en modo: ${isDev ? 'desarrollo (sin auth)' : 'producción'}`);

if (isDev) {
  // En desarrollo, permitir acceso sin autenticación para pruebas
  router.get('/users', userAdminController.getAllUsers);
  router.get('/users/:userId', userAdminController.getUserDetails);
  router.put('/users/:userId', userAdminController.updateUser);
  console.log('⚠️ ADVERTENCIA: Rutas de administración accesibles sin autenticación en modo desarrollo');
} else {
  // En producción, mantener seguridad
  router.get('/users', authenticate, isAdmin, userAdminController.getAllUsers);
  router.get('/users/:userId', authenticate, isAdmin, userAdminController.getUserDetails);
  router.put('/users/:userId', authenticate, isAdmin, userAdminController.updateUser);
}

module.exports = router;
