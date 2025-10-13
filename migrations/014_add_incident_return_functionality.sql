-- Migración para agregar funcionalidad de devolución de incidencias por técnicos
-- Fecha: 2025-10-13

-- 1. Agregar nuevo estado 'devuelto' al enum de status
ALTER TABLE incidents
    MODIFY COLUMN status
    ENUM('pendiente','en_proceso','en_supervision','rechazado','aprobado','devuelto')
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    NOT NULL DEFAULT 'pendiente';

-- 2. Agregar campos para tracking de devoluciones
ALTER TABLE incidents
    ADD COLUMN returned_by_id INT DEFAULT NULL AFTER assigned_to_id,
    ADD COLUMN return_reason TEXT DEFAULT NULL AFTER returned_by_id,
    ADD COLUMN returned_at TIMESTAMP NULL DEFAULT NULL AFTER return_reason,
    ADD COLUMN return_count INT DEFAULT 0 AFTER returned_at;

-- 3. Agregar foreign key para returned_by_id
ALTER TABLE incidents
    ADD CONSTRAINT incidents_ibfk_returned_by
    FOREIGN KEY (returned_by_id) REFERENCES users(id) ON DELETE SET NULL;

-- 4. Agregar índice para consultas de incidencias devueltas
CREATE INDEX idx_incidents_returned ON incidents(returned_by_id, returned_at);

-- Verificación
SELECT 'Migración 014: Funcionalidad de devolución de incidencias - Completada' as status;
