-- Migración 020: Agregar campo asignado
-- Fecha: 2025-01-22
-- Descripción: Agrega campo asignado para identificar a quién está asignado el activo (opcional)

-- Agregar campo asignado
ALTER TABLE activos 
ADD COLUMN asignado VARCHAR(100) NULL COMMENT 'Persona a quien está asignado el activo (opcional, diferente al responsable)';

-- Agregar índice para mejorar consultas
ALTER TABLE activos 
ADD INDEX idx_activos_asignado (asignado);

-- Comentario adicional para documentación
ALTER TABLE activos 
MODIFY COLUMN asignado VARCHAR(100) NULL COMMENT 'Persona específica a quien está asignado el activo para uso diario. Campo opcional, complementa al responsable.';