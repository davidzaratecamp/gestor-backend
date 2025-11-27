-- Migración 016: Agregar campo valor a la tabla activos (SEGURA)
-- Fecha: 2025-11-27

-- Verificar si la columna valor existe y agregarla solo si no existe
SET @sql = CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.COLUMNS 
          WHERE table_schema = 'call_center_support' 
          AND table_name = 'activos' 
          AND column_name = 'valor') = 0 
    THEN 'ALTER TABLE activos ADD COLUMN valor DECIMAL(15,2) NULL COMMENT ''Valor monetario del activo en pesos colombianos'' AFTER proveedor;'
    ELSE 'SELECT ''Column valor already exists'';'
END;

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Crear índice para consultas de valor (solo si no existe)
DROP INDEX IF EXISTS idx_activos_valor ON activos;
CREATE INDEX idx_activos_valor ON activos(valor);

-- Actualizar comentario de la tabla
ALTER TABLE activos COMMENT = 'Tabla de gestión de activos de la empresa con información completa incluyendo valor monetario';