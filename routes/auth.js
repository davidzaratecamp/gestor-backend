const express = require('express');
const router = express.Router();
const { login, getMe, changePassword } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

// Ruta para el login
router.post('/login', login);

// Ruta para obtener información del usuario autenticado
router.get('/me', verifyToken, getMe);

// Ruta para cambiar contraseña
router.put('/change-password', verifyToken, changePassword);

module.exports = router;