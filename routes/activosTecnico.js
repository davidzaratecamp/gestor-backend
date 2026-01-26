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
