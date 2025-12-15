-- Migración 018: Agregar campo Site
-- Fecha: 2025-01-XX
-- Descripción: Agrega campo Site con opciones Site A y Site B

-- 1. Agregar columna site a la tabla activos
ALTER TABLE activos 
ADD COLUMN site ENUM('Site A', 'Site B') NOT NULL COMMENT 'Ubicación del site del activo';

-- 2. Crear índice para mejorar consultas
ALTER TABLE activos 
ADD INDEX idx_activos_site (site);

-- 3. Establecer valor por defecto para registros existentes (opcional - se puede hacer manualmente)
-- UPDATE activos SET site = 'Site A' WHERE site IS NULL;