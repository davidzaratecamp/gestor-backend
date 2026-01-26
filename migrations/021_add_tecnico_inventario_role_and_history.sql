-- Migration: Add tecnicoInventario role and activos_historial table
-- Date: 2024

-- 1. Add tecnicoInventario to users role ENUM
ALTER TABLE users
MODIFY COLUMN role ENUM('admin', 'coordinador', 'supervisor', 'technician', 'jefe_operaciones', 'administrativo', 'anonimo', 'gestorActivos', 'tecnicoInventario') NOT NULL;

-- 2. Create activos_historial table for tracking hardware component changes
CREATE TABLE IF NOT EXISTS activos_historial (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activo_id INT NOT NULL,
    campo_modificado ENUM('cpu_procesador', 'memoria_ram', 'almacenamiento', 'sistema_operativo') NOT NULL,
    valor_anterior VARCHAR(300) NULL,
    valor_nuevo VARCHAR(300) NOT NULL,
    modificado_por_id INT NOT NULL,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activo_id) REFERENCES activos(id) ON DELETE CASCADE,
    FOREIGN KEY (modificado_por_id) REFERENCES users(id)
);

-- 3. Add indexes for better performance
CREATE INDEX idx_activos_historial_activo_id ON activos_historial(activo_id);
CREATE INDEX idx_activos_historial_modificado_por ON activos_historial(modificado_por_id);
CREATE INDEX idx_activos_historial_fecha ON activos_historial(fecha_modificacion);
