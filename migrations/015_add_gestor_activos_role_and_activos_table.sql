-- Migración 015: Agregar rol gestorActivos y tabla de activos
-- Fecha: 2025-01-XX

-- 1. Actualizar el ENUM de roles para incluir gestorActivos
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'supervisor', 'technician', 'coordinator', 'jefe_operaciones', 'anonimo', 'gestorActivos') NOT NULL;

-- 2. Crear tabla de activos
CREATE TABLE activos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_placa VARCHAR(100) NOT NULL,
    centro_costes INT NOT NULL CHECK (centro_costes BETWEEN 1 AND 10),
    ubicacion ENUM('Claro', 'Obama', 'IT', 'Contratación', 'Reclutamiento', 'Selección', 'Finanzas') NOT NULL,
    empresa VARCHAR(50) NOT NULL DEFAULT 'Asiste',
    responsable VARCHAR(100) NOT NULL,
    proveedor VARCHAR(200),
    fecha_compra DATE,
    numero_social VARCHAR(100),
    poliza VARCHAR(100),
    aseguradora VARCHAR(200),
    garantia ENUM('Si', 'No') NOT NULL DEFAULT 'No',
    fecha_vencimiento_garantia DATE NULL,
    orden_compra VARCHAR(100),
    clasificacion ENUM('Activo productivo', 'Activo no productivo') NOT NULL,
    clasificacion_activo_fijo VARCHAR(200),
    adjunto_archivo VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by_id INT,
    
    -- Constraint para que la fecha de vencimiento de garantía solo sea requerida si garantia = 'Si'
    CHECK (
        (garantia = 'No' AND fecha_vencimiento_garantia IS NULL) OR 
        (garantia = 'Si' AND fecha_vencimiento_garantia IS NOT NULL)
    ),
    
    -- Foreign key al usuario que creó el activo
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Crear índices para mejorar rendimiento
CREATE INDEX idx_activos_numero_placa ON activos(numero_placa);
CREATE INDEX idx_activos_ubicacion ON activos(ubicacion);
CREATE INDEX idx_activos_responsable ON activos(responsable);
CREATE INDEX idx_activos_created_at ON activos(created_at);

-- 4. Comentarios en las columnas para documentación
ALTER TABLE activos 
MODIFY COLUMN numero_placa VARCHAR(100) NOT NULL COMMENT 'Número de placa del activo',
MODIFY COLUMN centro_costes INT NOT NULL COMMENT 'Centro de costes (1-10)',
MODIFY COLUMN ubicacion ENUM('Claro', 'Obama', 'IT', 'Contratación', 'Reclutamiento', 'Selección', 'Finanzas') NOT NULL COMMENT 'Ubicación física del activo',
MODIFY COLUMN empresa VARCHAR(50) NOT NULL DEFAULT 'Asiste' COMMENT 'Empresa propietaria (valor fijo)',
MODIFY COLUMN responsable VARCHAR(100) NOT NULL COMMENT 'Director responsable del activo',
MODIFY COLUMN proveedor VARCHAR(200) COMMENT 'Proveedor del activo',
MODIFY COLUMN fecha_compra DATE COMMENT 'Fecha de compra del activo',
MODIFY COLUMN numero_social VARCHAR(100) COMMENT 'Número social del activo',
MODIFY COLUMN poliza VARCHAR(100) COMMENT 'Número de póliza (opcional)',
MODIFY COLUMN aseguradora VARCHAR(200) COMMENT 'Nombre de la aseguradora (opcional)',
MODIFY COLUMN garantia ENUM('Si', 'No') NOT NULL DEFAULT 'No' COMMENT 'Indica si tiene garantía',
MODIFY COLUMN fecha_vencimiento_garantia DATE NULL COMMENT 'Fecha de vencimiento de la garantía (solo si tiene garantía)',
MODIFY COLUMN orden_compra VARCHAR(100) COMMENT 'Número de orden de compra',
MODIFY COLUMN clasificacion ENUM('Activo productivo', 'Activo no productivo') NOT NULL COMMENT 'Clasificación del activo',
MODIFY COLUMN clasificacion_activo_fijo VARCHAR(200) COMMENT 'Clasificación de activo fijo',
MODIFY COLUMN adjunto_archivo VARCHAR(500) COMMENT 'Ruta del archivo adjunto (imagen o PDF)';