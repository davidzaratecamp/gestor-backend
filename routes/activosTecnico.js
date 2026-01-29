const express = require('express');
const router = express.Router();
const { verifyToken, verifyRole } = require('../middleware/auth');
const activoTecnicoController = require('../controllers/activoTecnicoController');

// Middleware para verificar roles que pueden acceder a activos
const canAccessAssets = verifyRole(['tecnicoInventario', 'gestorActivos', 'admin']);

// Middleware para verificar roles que pueden ver historial
const canViewHistory = verifyRole(['gestorActivos', 'admin']);

// Middleware para verificar roles que pueden editar componentes
const canEditHardwareComponents = verifyRole(['tecnicoInventario', 'gestorActivos', 'admin']);

// @route   GET /api/activos-tecnico
// @desc    Obtener activos editables (CPU, Portátil, Servidor)
// @access  Private (tecnicoInventario, gestorActivos, admin)
router.get('/', verifyToken, canAccessAssets, activoTecnicoController.getActivosEditables);

// @route   GET /api/activos-tecnico/historial
// @desc    Obtener todo el historial de cambios
// @access  Private (gestorActivos, admin)
router.get('/historial', verifyToken, canViewHistory, activoTecnicoController.getAllHistorial);

// @route   GET /api/activos-tecnico/historial/stats
// @desc    Obtener estadísticas del historial de cambios
// @access  Private (gestorActivos, admin)
router.get('/historial/stats', verifyToken, canViewHistory, activoTecnicoController.getHistorialStats);

// @route   GET /api/activos-tecnico/historial/filtered
// @desc    Obtener historial filtrado con paginación
// @access  Private (gestorActivos, admin)
router.get('/historial/filtered', verifyToken, canViewHistory, activoTecnicoController.getFilteredHistorial);

// @route   GET /api/activos-tecnico/no-productivos
// @desc    Obtener activos clasificados como "Activo no productivo"
// @access  Private (gestorActivos, admin)
router.get('/no-productivos', verifyToken, canViewHistory, activoTecnicoController.getActivosNoProductivos);

// @route   PUT /api/activos-tecnico/:id/dar-de-baja
// @desc    Dar de baja un activo
// @access  Private (gestorActivos, admin)
router.put('/:id/dar-de-baja', verifyToken, canViewHistory, activoTecnicoController.darDeBajaActivo);

// @route   POST /api/activos-tecnico/:id/inventario
// @desc    Crear observación de inventario para un activo
// @access  Private (tecnicoInventario, gestorActivos, admin)
router.post('/:id/inventario', verifyToken, canEditHardwareComponents, activoTecnicoController.crearObservacionInventario);

// @route   GET /api/activos-tecnico/:id/inventario
// @desc    Obtener observaciones de inventario de un activo
// @access  Private (tecnicoInventario, gestorActivos, admin)
router.get('/:id/inventario', verifyToken, canAccessAssets, activoTecnicoController.getObservacionesInventario);

// @route   GET /api/activos-tecnico/:id/componentes
// @desc    Obtener componentes editables de un activo específico
// @access  Private (tecnicoInventario, gestorActivos, admin)
router.get('/:id/componentes', verifyToken, canAccessAssets, activoTecnicoController.getComponentesActivo);

// @route   PUT /api/activos-tecnico/:id/componente
// @desc    Actualizar un componente de hardware
// @access  Private (tecnicoInventario, gestorActivos, admin)
router.put('/:id/componente', verifyToken, canEditHardwareComponents, activoTecnicoController.actualizarComponente);

// @route   GET /api/activos-tecnico/:id/historial
// @desc    Obtener historial de cambios de un activo
// @access  Private (gestorActivos, admin) - NO tecnicoInventario
router.get('/:id/historial', verifyToken, canViewHistory, activoTecnicoController.getHistorialActivo);

module.exports = router;
