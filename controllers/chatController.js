const db = require('../config/db');

// @desc    Enviar mensaje en chat privado
// @route   POST /api/chat/send
// @access  Private (Solo anónimos y Hanny)
exports.sendMessage = async (req, res) => {
    try {
        const { to_user_id, message } = req.body;
        const from_user_id = req.user.id;

        // Validar que el usuario sea anónimo o Hanny
        if (req.user.role !== 'anonimo' && req.user.username !== 'hannycita10') {
            return res.status(403).json({ msg: 'No tienes permisos para usar el chat' });
        }

        // Si es anónimo, solo puede enviar mensajes a Hanny
        if (req.user.role === 'anonimo') {
            const [hannyUser] = await db.query('SELECT id FROM users WHERE username = ?', ['hannycita10']);
            if (!hannyUser.length || to_user_id !== hannyUser[0].id) {
                return res.status(403).json({ msg: 'Solo puedes enviar mensajes al administrador' });
            }
        }

        // Si es Hanny, verificar que el destinatario sea anónimo
        if (req.user.username === 'hannycita10') {
            const [targetUser] = await db.query('SELECT role FROM users WHERE id = ?', [to_user_id]);
            if (!targetUser.length || targetUser[0].role !== 'anonimo') {
                return res.status(403).json({ msg: 'Solo puedes responder a usuarios anónimos' });
            }
        }

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ msg: 'El mensaje no puede estar vacío' });
        }

        // Insertar mensaje
        const [result] = await db.execute(`
            INSERT INTO private_chat_messages (from_user_id, to_user_id, message) 
            VALUES (?, ?, ?)
        `, [from_user_id, to_user_id, message.trim()]);

        const messageId = result.insertId;

        // Obtener información completa del mensaje para el WebSocket
        const [messageData] = await db.execute(`
            SELECT 
                m.*,
                from_user.full_name as from_user_name,
                to_user.full_name as to_user_name
            FROM private_chat_messages m
            JOIN users from_user ON m.from_user_id = from_user.id
            JOIN users to_user ON m.to_user_id = to_user.id
            WHERE m.id = ?
        `, [messageId]);

        // Enviar notificación en tiempo real al destinatario
        if (global.sendMessageToUser) {
            const sent = global.sendMessageToUser(to_user_id, 'new_message', {
                message: messageData[0],
                sender: {
                    id: from_user_id,
                    name: req.user.fullName || req.user.full_name,
                    role: req.user.role
                }
            });
            console.log(`Notificación WebSocket enviada a usuario ${to_user_id}:`, sent);
        }

        // Crear o actualizar conversación
        if (req.user.role === 'anonimo') {
            await db.execute(`
                INSERT INTO chat_conversations (anonymous_user_id, admin_user_id, last_message_at) 
                VALUES (?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                last_message_at = NOW(), status = 'active'
            `, [from_user_id, to_user_id]);
        } else {
            await db.execute(`
                INSERT INTO chat_conversations (anonymous_user_id, admin_user_id, last_message_at) 
                VALUES (?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                last_message_at = NOW(), status = 'active'
            `, [to_user_id, from_user_id]);
        }

        res.status(201).json({
            msg: 'Mensaje enviado exitosamente',
            message_id: result.insertId
        });

    } catch (err) {
        console.error('Error enviando mensaje:', err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener mensajes de conversación
// @route   GET /api/chat/messages/:userId
// @access  Private (Solo anónimos y Hanny)
exports.getMessages = async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        const currentUserId = req.user.id;

        // Validar permisos
        if (req.user.role !== 'anonimo' && req.user.username !== 'hannycita10') {
            return res.status(403).json({ msg: 'No tienes permisos para ver el chat' });
        }

        // Obtener mensajes entre los dos usuarios
        const [messages] = await db.query(`
            SELECT 
                m.id,
                m.from_user_id,
                m.to_user_id,
                m.message,
                m.is_read,
                m.created_at,
                from_user.full_name as from_user_name,
                from_user.username as from_username,
                to_user.full_name as to_user_name,
                to_user.username as to_username
            FROM private_chat_messages m
            JOIN users from_user ON m.from_user_id = from_user.id
            JOIN users to_user ON m.to_user_id = to_user.id
            WHERE (m.from_user_id = ? AND m.to_user_id = ?) 
               OR (m.from_user_id = ? AND m.to_user_id = ?)
            ORDER BY m.created_at ASC
        `, [currentUserId, otherUserId, otherUserId, currentUserId]);

        // Marcar mensajes como leídos
        await db.execute(`
            UPDATE private_chat_messages 
            SET is_read = TRUE 
            WHERE to_user_id = ? AND from_user_id = ? AND is_read = FALSE
        `, [currentUserId, otherUserId]);

        res.json({ messages });

    } catch (err) {
        console.error('Error obteniendo mensajes:', err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener conversaciones activas (solo para Hanny)
// @route   GET /api/chat/conversations
// @access  Private (Solo Hanny)
exports.getConversations = async (req, res) => {
    try {
        console.log('=== DEBUG CONVERSACIONES ===');
        console.log('req.user completo:', JSON.stringify(req.user, null, 2));
        console.log('req.user.username:', req.user.username);
        console.log('Comparación:', req.user.username === 'hannycita10');
        console.log('=== FIN DEBUG ===');
        
        // Solo Hanny puede ver las conversaciones
        if (req.user.username !== 'hannycita10') {
            return res.status(403).json({ msg: 'No tienes permisos para ver las conversaciones' });
        }

        const [conversations] = await db.query(`
            SELECT 
                c.id,
                c.anonymous_user_id,
                c.status,
                c.last_message_at,
                c.created_at,
                u.full_name as anonymous_user_name,
                u.username as anonymous_username,
                (SELECT COUNT(*) FROM private_chat_messages 
                 WHERE to_user_id = ? AND from_user_id = c.anonymous_user_id AND is_read = FALSE) as unread_count,
                (SELECT message FROM private_chat_messages 
                 WHERE (from_user_id = c.anonymous_user_id AND to_user_id = ?) 
                    OR (from_user_id = ? AND to_user_id = c.anonymous_user_id)
                 ORDER BY created_at DESC LIMIT 1) as last_message
            FROM chat_conversations c
            JOIN users u ON c.anonymous_user_id = u.id
            WHERE c.admin_user_id = ? AND c.status = 'active'
            ORDER BY c.last_message_at DESC
        `, [req.user.id, req.user.id, req.user.id, req.user.id]);

        res.json({ conversations });

    } catch (err) {
        console.error('Error obteniendo conversaciones:', err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener ID de Hanny (para anónimos)
// @route   GET /api/chat/admin-info
// @access  Private (Solo anónimos)
exports.getAdminInfo = async (req, res) => {
    try {
        if (req.user.role !== 'anonimo') {
            return res.status(403).json({ msg: 'Solo usuarios anónimos pueden acceder' });
        }

        const [hannyUser] = await db.query(
            'SELECT id, full_name, username FROM users WHERE username = ?', 
            ['hannycita10']
        );

        if (!hannyUser.length) {
            return res.status(404).json({ msg: 'Administrador no encontrado' });
        }

        res.json({ admin: hannyUser[0] });

    } catch (err) {
        console.error('Error obteniendo info del admin:', err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener conteo de mensajes no leídos
// @route   GET /api/chat/unread-count
// @access  Private (Solo anónimos y Hanny)
exports.getUnreadCount = async (req, res) => {
    try {
        if (req.user.role !== 'anonimo' && req.user.username !== 'hannycita10') {
            return res.status(403).json({ msg: 'No tienes permisos para usar el chat' });
        }

        const [result] = await db.query(`
            SELECT COUNT(*) as unread_count 
            FROM private_chat_messages 
            WHERE to_user_id = ? AND is_read = FALSE
        `, [req.user.id]);

        res.json({ unread_count: result[0].unread_count });

    } catch (err) {
        console.error('Error obteniendo conteo de no leídos:', err.message);
        res.status(500).send('Error del servidor');
    }
};