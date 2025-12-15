-- Migración 017: Agregar campos dinámicos por tipo de activo
-- Fecha: 2025-01-XX
-- Descripción: Agrega campos específicos según el prefijo del número de placa (ECC-CPU, ECC-SER, ECC-MON, ECC-IMP, ECC-POR, ECC-TV)

-- 1. Agregar campos comunes para equipos de cómputo (CPU, SER, POR)
ALTER TABLE activos 
ADD COLUMN marca_modelo VARCHAR(200) NULL COMMENT 'Marca y modelo del equipo. Ej: Dell OptiPlex 7080',
ADD COLUMN numero_serie_fabricante VARCHAR(200) NULL COMMENT 'Número de serie del fabricante',
ADD COLUMN cpu_procesador VARCHAR(300) NULL COMMENT 'Tipo, marca y velocidad del procesador. Ej: Intel Core i5-10400 2.9GHz',
ADD COLUMN memoria_ram VARCHAR(200) NULL COMMENT 'Capacidad y tipo de memoria. Ej: 16GB DDR4',
ADD COLUMN almacenamiento VARCHAR(200) NULL COMMENT 'Tipo y capacidad de almacenamiento. Ej: SSD 512GB',
ADD COLUMN sistema_operativo VARCHAR(200) NULL COMMENT 'Sistema operativo instalado. Ej: Windows 11 Pro',

-- 2. Agregar campos para monitores y TV (MON, TV)
ADD COLUMN pulgadas VARCHAR(50) NULL COMMENT 'Tamaño en pulgadas del monitor/TV',

-- 3. Agregar campo de estado para todos los tipos
ADD COLUMN estado ENUM('funcional', 'en_reparacion', 'dado_de_baja', 'en_mantenimiento', 'disponible', 'asignado', 'fuera_de_servicio') NOT NULL DEFAULT 'funcional' COMMENT 'Estado actual del activo',

-- 4. Agregar campo para determinar el tipo de activo basado en el prefijo
ADD COLUMN tipo_activo ENUM('ECC-CPU', 'ECC-SER', 'ECC-MON', 'ECC-IMP', 'ECC-POR', 'ECC-TV', 'OTHER') NULL COMMENT 'Tipo de activo según prefijo del número de placa',

-- 5. Agregar índices para mejorar consultas
ADD INDEX idx_activos_tipo_activo (tipo_activo),
ADD INDEX idx_activos_estado (estado),
ADD INDEX idx_activos_marca_modelo (marca_modelo),
ADD INDEX idx_activos_numero_serie (numero_serie_fabricante);

-- 6. Crear función o trigger para actualizar automáticamente el tipo_activo basado en numero_placa
-- (Se implementará en el código de aplicación por compatibilidad)

-- 7. Comentarios adicionales para documentación
ALTER TABLE activos 
MODIFY COLUMN marca_modelo VARCHAR(200) NULL COMMENT 'Marca y modelo (todos los tipos excepto genérico)',
MODIFY COLUMN numero_serie_fabricante VARCHAR(200) NULL COMMENT 'Número de serie del fabricante (todos los tipos excepto genérico)',
MODIFY COLUMN cpu_procesador VARCHAR(300) NULL COMMENT 'CPU/Procesador (ECC-CPU, ECC-SER, ECC-POR)',
MODIFY COLUMN memoria_ram VARCHAR(200) NULL COMMENT 'Memoria RAM (ECC-CPU, ECC-SER, ECC-POR)',
MODIFY COLUMN almacenamiento VARCHAR(200) NULL COMMENT 'Almacenamiento (ECC-CPU, ECC-SER, ECC-POR)',
MODIFY COLUMN sistema_operativo VARCHAR(200) NULL COMMENT 'Sistema operativo (ECC-CPU, ECC-SER, ECC-POR)',
MODIFY COLUMN pulgadas VARCHAR(50) NULL COMMENT 'Pulgadas (ECC-MON, ECC-TV)',
MODIFY COLUMN estado ENUM('funcional', 'en_reparacion', 'dado_de_baja', 'en_mantenimiento', 'disponible', 'asignado', 'fuera_de_servicio') NOT NULL DEFAULT 'funcional' COMMENT 'Estado del activo (todos los tipos)';

-- 8. Actualizar activos existentes para establecer tipo_activo
-- Patrón esperado: ECC-CPU-001, ECC-SER-002, ECC-MON-001, etc.
UPDATE activos 
SET tipo_activo = CASE 
    WHEN UPPER(numero_placa) REGEXP '^ECC-CPU-[0-9]+$' THEN 'ECC-CPU'
    WHEN UPPER(numero_placa) REGEXP '^ECC-SER-[0-9]+$' THEN 'ECC-SER'
    WHEN UPPER(numero_placa) REGEXP '^ECC-MON-[0-9]+$' THEN 'ECC-MON'
    WHEN UPPER(numero_placa) REGEXP '^ECC-IMP-[0-9]+$' THEN 'ECC-IMP'
    WHEN UPPER(numero_placa) REGEXP '^ECC-POR-[0-9]+$' THEN 'ECC-POR'
    WHEN UPPER(numero_placa) REGEXP '^ECC-TV-[0-9]+$' THEN 'ECC-TV'
    -- También detectar prefijos incompletos mientras se escribe
    WHEN UPPER(numero_placa) LIKE 'ECC-CPU%' THEN 'ECC-CPU'
    WHEN UPPER(numero_placa) LIKE 'ECC-SER%' THEN 'ECC-SER'
    WHEN UPPER(numero_placa) LIKE 'ECC-MON%' THEN 'ECC-MON'
    WHEN UPPER(numero_placa) LIKE 'ECC-IMP%' THEN 'ECC-IMP'
    WHEN UPPER(numero_placa) LIKE 'ECC-POR%' THEN 'ECC-POR'
    WHEN UPPER(numero_placa) LIKE 'ECC-TV%' THEN 'ECC-TV'
    ELSE 'OTHER'
END;