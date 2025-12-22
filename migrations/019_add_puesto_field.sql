-- Migración 019: Agregar campo puesto
-- Fecha: 2025-01-XX
-- Descripción: Agrega campo puesto para identificar la ubicación física del activo

-- Agregar campo puesto
ALTER TABLE activos 
ADD COLUMN puesto VARCHAR(50) NULL COMMENT 'Número o identificación del puesto donde está ubicado el activo';

-- Agregar índice para mejorar consultas
ALTER TABLE activos 
ADD INDEX idx_activos_puesto (puesto);

-- Comentario adicional para documentación
ALTER TABLE activos 
MODIFY COLUMN puesto VARCHAR(50) NULL COMMENT 'Puesto físico donde está ubicado el activo (ej: 001, 090, 106). Campo opcional.';