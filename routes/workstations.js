const express = require('express');
const router = express.Router();
const {
    getAllWorkstations,
    getWorkstationById,
    createWorkstation,
    updateWorkstation,
    deleteWorkstation
} = require('../controllers/workstationController');
const { verifyToken, isAdmin, isAdminOrCoordinador } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas accesibles para todos los usuarios autenticados
router.get('/', getAllWorkstations);
router.get('/:id', getWorkstationById);

// Rutas para administradores y coordinadores
router.post('/', isAdminOrCoordinador, createWorkstation);
router.put('/:id', isAdminOrCoordinador, updateWorkstation);
// Solo admin puede eliminar workstations
router.delete('/:id', isAdmin, deleteWorkstation);

module.exports = router;