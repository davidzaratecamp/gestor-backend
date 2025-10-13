const User = require('../models/User');
const db = require('../config/db');
require('dotenv').config();

/**
 * Script para probar la eliminación de usuarios con dependencias
 * Este script crea un usuario de prueba, verifica que se puede eliminar
 * y muestra información sobre las dependencias eliminadas
 */

async function testUserDeletion() {
    console.log('='.repeat(70));
    console.log('PRUEBA DE ELIMINACIÓN DE USUARIOS CON DEPENDENCIAS');
    console.log('='.repeat(70));
    console.log('');

    try {
        // 1. Crear usuario de prueba
        console.log('1. Creando usuario de prueba...');
        const testUser = await User.create({
            username: `test_user_${Date.now()}`,
            password: 'test123456',
            full_name: 'Usuario de Prueba para Eliminar',
            role: 'technician',
            sede: 'bogota'
        });
        console.log(`✅ Usuario creado con ID: ${testUser.id}`);
        console.log('');

        // 2. Verificar que el usuario existe
        console.log('2. Verificando que el usuario existe...');
        const userExists = await User.getById(testUser.id);
        if (userExists) {
            console.log(`✅ Usuario encontrado: ${userExists.username} - ${userExists.full_name}`);
        } else {
            console.log('❌ Error: Usuario no encontrado después de crearlo');
            return;
        }
        console.log('');

        // 3. Verificar dependencias antes de eliminar
        console.log('3. Verificando dependencias del usuario...');
        const dependencies = await checkUserDependencies(testUser.id);
        console.log('');

        // 4. Eliminar usuario
        console.log('4. Intentando eliminar usuario...');
        const deleted = await User.deleteWithDependencies(testUser.id);

        if (deleted) {
            console.log('✅ Usuario eliminado exitosamente');
        } else {
            console.log('❌ Error: No se pudo eliminar el usuario');
            return;
        }
        console.log('');

        // 5. Verificar que el usuario ya no existe
        console.log('5. Verificando que el usuario fue eliminado...');
        const userStillExists = await User.getById(testUser.id);
        if (!userStillExists) {
            console.log('✅ Usuario eliminado correctamente de la base de datos');
        } else {
            console.log('❌ Error: El usuario todavía existe en la base de datos');
        }
        console.log('');

        console.log('='.repeat(70));
        console.log('PRUEBA COMPLETADA EXITOSAMENTE');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('');
        console.error('❌ ERROR EN LA PRUEBA:');
        console.error('='.repeat(70));
        console.error('Mensaje:', error.message);
        console.error('Código:', error.code);
        if (error.sql) {
            console.error('SQL:', error.sql);
        }
        console.error('='.repeat(70));
    } finally {
        // Cerrar conexión a la base de datos
        process.exit(0);
    }
}

/**
 * Verifica todas las dependencias de un usuario en la base de datos
 */
async function checkUserDependencies(userId) {
    const dependencies = {
        private_chat_messages: 0,
        chat_conversations: 0,
        supervision_alerts: 0,
        technician_ratings: 0,
        incident_attachments: 0,
        incident_history: 0,
        incidents: 0
    };

    try {
        // Mensajes de chat privados
        const [chatMessages] = await db.query(
            'SELECT COUNT(*) as count FROM private_chat_messages WHERE from_user_id = ? OR to_user_id = ?',
            [userId, userId]
        );
        dependencies.private_chat_messages = chatMessages[0].count;

        // Conversaciones de chat
        const [conversations] = await db.query(
            'SELECT COUNT(*) as count FROM chat_conversations WHERE anonymous_user_id = ? OR admin_user_id = ?',
            [userId, userId]
        );
        dependencies.chat_conversations = conversations[0].count;

        // Alertas de supervisión
        const [alerts] = await db.query(
            'SELECT COUNT(*) as count FROM supervision_alerts WHERE sent_by_id = ? OR sent_to_id = ?',
            [userId, userId]
        );
        dependencies.supervision_alerts = alerts[0].count;

        // Calificaciones de técnicos
        const [ratings] = await db.query(
            'SELECT COUNT(*) as count FROM technician_ratings WHERE technician_id = ? OR rated_by_id = ?',
            [userId, userId]
        );
        dependencies.technician_ratings = ratings[0].count;

        // Archivos adjuntos
        const [attachments] = await db.query(
            'SELECT COUNT(*) as count FROM incident_attachments WHERE uploaded_by = ?',
            [userId]
        );
        dependencies.incident_attachments = attachments[0].count;

        // Historial de incidencias
        const [history] = await db.query(
            'SELECT COUNT(*) as count FROM incident_history WHERE user_id = ?',
            [userId]
        );
        dependencies.incident_history = history[0].count;

        // Incidencias
        const [incidents] = await db.query(
            'SELECT COUNT(*) as count FROM incidents WHERE reported_by_id = ? OR assigned_to_id = ?',
            [userId, userId]
        );
        dependencies.incidents = incidents[0].count;

        // Mostrar resumen
        console.log('   Dependencias encontradas:');
        console.log(`   - Mensajes de chat: ${dependencies.private_chat_messages}`);
        console.log(`   - Conversaciones: ${dependencies.chat_conversations}`);
        console.log(`   - Alertas: ${dependencies.supervision_alerts}`);
        console.log(`   - Calificaciones: ${dependencies.technician_ratings}`);
        console.log(`   - Archivos adjuntos: ${dependencies.incident_attachments}`);
        console.log(`   - Historial: ${dependencies.incident_history}`);
        console.log(`   - Incidencias: ${dependencies.incidents}`);

        const totalDependencies = Object.values(dependencies).reduce((sum, count) => sum + count, 0);
        if (totalDependencies === 0) {
            console.log('   ✅ No hay dependencias (usuario limpio para eliminar)');
        } else {
            console.log(`   ⚠️  Total de dependencias: ${totalDependencies}`);
        }

        return dependencies;
    } catch (error) {
        console.error('   ❌ Error al verificar dependencias:', error.message);
        throw error;
    }
}

// Ejecutar la prueba
testUserDeletion();
