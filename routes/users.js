const express = require('express');
const router = express.Router();
const {
    getAllUsers,
    getTechnicians,
    getUserById,
    createUser,
    updateUser,
    deleteUser
} = require('../controllers/userController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Rutas protegidas - requieren autenticación
router.use(verifyToken);

// Ruta para obtener todos los técnicos (accesible para todos los roles)
router.get('/technicians', getTechnicians);

// Rutas solo para administradores
router.get('/', isAdmin, getAllUsers);
router.get('/:id', isAdmin, getUserById);
router.post('/', isAdmin, createUser);
router.put('/:id', isAdmin, updateUser);
router.delete('/:id', isAdmin, deleteUser);

module.exports = router;