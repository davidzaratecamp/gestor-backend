const express = require('express');
const router = express.Router();
const {
    sendMessage,
    getMessages,
    getConversations,
    getAdminInfo,
    getUnreadCount
} = require('../controllers/chatController');
const { verifyToken } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Enviar mensaje
router.post('/send', sendMessage);

// Obtener mensajes de conversación
router.get('/messages/:userId', getMessages);

// Obtener conversaciones activas (solo Hanny)
router.get('/conversations', getConversations);

// Obtener info del admin (solo anónimos)
router.get('/admin-info', getAdminInfo);

// Obtener conteo de mensajes no leídos
router.get('/unread-count', getUnreadCount);

module.exports = router;