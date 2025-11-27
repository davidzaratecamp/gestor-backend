-- Migración 016: Agregar campo valor a la tabla activos
-- Fecha: 2025-11-27

-- Agregar columna valor a la tabla activos
ALTER TABLE activos 
ADD COLUMN valor DECIMAL(15,2) NULL COMMENT 'Valor monetario del activo en pesos colombianos'
AFTER proveedor;

-- Crear índice para consultas de valor (solo si no existe)
DROP INDEX IF EXISTS idx_activos_valor ON activos;
CREATE INDEX idx_activos_valor ON activos(valor);

-- Actualizar comentario de la tabla
ALTER TABLE activos COMMENT = 'Tabla de gestión de activos de la empresa con información completa incluyendo valor monetario';