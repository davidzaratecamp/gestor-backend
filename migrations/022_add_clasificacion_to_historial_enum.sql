-- Migration: Add 'clasificacion' to activos_historial campo_modificado ENUM
-- This allows tecnicoInventario to change asset classification and track it in history

ALTER TABLE activos_historial
MODIFY COLUMN campo_modificado ENUM('cpu_procesador', 'memoria_ram', 'almacenamiento', 'sistema_operativo', 'clasificacion') NOT NULL;
