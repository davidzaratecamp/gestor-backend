-- Migration 024: Add 'estado' to campo_modificado ENUM in activos_historial
-- This allows tracking when an asset's estado changes (e.g., dado_de_baja)

ALTER TABLE activos_historial
MODIFY COLUMN campo_modificado ENUM('cpu_procesador', 'memoria_ram', 'almacenamiento', 'sistema_operativo', 'clasificacion', 'estado') NOT NULL;
