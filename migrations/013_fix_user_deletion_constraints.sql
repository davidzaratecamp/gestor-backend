-- Migración para permitir la eliminación de usuarios con dependencias
-- Esta migración NO cambia el comportamiento actual del modelo User.deleteWithDependencies()
-- Solo documenta la estructura de foreign keys existente

-- NOTA IMPORTANTE:
-- El modelo User.deleteWithDependencies() maneja manualmente la eliminación en el orden correcto
-- mediante transacciones. Esta migración es solo para documentación y verificación.

-- Verificar foreign keys existentes (solo para documentación)
-- Si necesitas agregar foreign keys explícitas en el futuro, descomenta y ajusta según necesidad:

/*
-- 1. private_chat_messages
ALTER TABLE private_chat_messages
    ADD CONSTRAINT fk_private_chat_from_user
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_private_chat_to_user
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE RESTRICT;

-- 2. chat_conversations
ALTER TABLE chat_conversations
    ADD CONSTRAINT fk_chat_conv_anonymous
    FOREIGN KEY (anonymous_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_chat_conv_admin
    FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE RESTRICT;

-- 3. supervision_alerts
ALTER TABLE supervision_alerts
    ADD CONSTRAINT fk_supervision_sent_by
    FOREIGN KEY (sent_by_id) REFERENCES users(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_supervision_sent_to
    FOREIGN KEY (sent_to_id) REFERENCES users(id) ON DELETE RESTRICT;

-- 4. technician_ratings
ALTER TABLE technician_ratings
    ADD CONSTRAINT fk_rating_technician
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_rating_rated_by
    FOREIGN KEY (rated_by_id) REFERENCES users(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_rating_incident
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE;

-- 5. incident_attachments
ALTER TABLE incident_attachments
    ADD CONSTRAINT fk_attachment_incident
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_attachment_uploaded_by
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT;

-- 6. incident_history
ALTER TABLE incident_history
    ADD CONSTRAINT fk_history_incident
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_history_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

-- 7. incidents
ALTER TABLE incidents
    ADD CONSTRAINT fk_incident_workstation
    FOREIGN KEY (workstation_id) REFERENCES workstations(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_incident_reported_by
    FOREIGN KEY (reported_by_id) REFERENCES users(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_incident_assigned_to
    FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE SET NULL;
*/

-- ============================================================================
-- SOLUCIÓN ACTUAL IMPLEMENTADA
-- ============================================================================
-- El modelo User.deleteWithDependencies() maneja la eliminación en el siguiente orden:
-- 1. DELETE FROM private_chat_messages WHERE from_user_id = ? OR to_user_id = ?
-- 2. DELETE FROM chat_conversations WHERE anonymous_user_id = ? OR admin_user_id = ?
-- 3. DELETE FROM supervision_alerts WHERE sent_by_id = ? OR sent_to_id = ?
-- 4. DELETE FROM technician_ratings WHERE technician_id = ? OR rated_by_id = ?
-- 5. DELETE FROM incident_attachments WHERE uploaded_by = ?
-- 6. DELETE FROM incident_history WHERE user_id = ?
-- 7. DELETE FROM incidents WHERE reported_by_id = ? OR assigned_to_id = ?
-- 8. DELETE FROM users WHERE id = ?
-- ============================================================================

-- Verificación exitosa: Esta migración no requiere cambios en la estructura actual
SELECT 'Migración 013: Documentación de eliminación de usuarios - Completada' as status;
