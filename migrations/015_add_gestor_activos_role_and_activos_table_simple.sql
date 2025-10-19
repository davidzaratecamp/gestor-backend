-- Migración 015: Agregar rol gestorActivos y tabla de activos (SIMPLE)
-- Fecha: 2025-01-XX

-- 1. Actualizar el ENUM de roles para incluir gestorActivos
ALTER TABLE users MODIFY COLUMN role ENUM('admin','supervisor','coordinador','jefe_operaciones','technician','administrativo','anonimo','gestorActivos') NOT NULL DEFAULT 'technician';

-- 2. Crear tabla de activos
CREATE TABLE activos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_placa VARCHAR(100) NOT NULL,
    centro_costes INT NOT NULL,
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
    
    -- Foreign key al usuario que creó el activo
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraint para centro de costes
    CHECK (centro_costes BETWEEN 1 AND 10)
);

-- 3. Crear índices para mejorar rendimiento
CREATE INDEX idx_activos_numero_placa ON activos(numero_placa);
CREATE INDEX idx_activos_ubicacion ON activos(ubicacion);
CREATE INDEX idx_activos_responsable ON activos(responsable);
CREATE INDEX idx_activos_created_at ON activos(created_at);