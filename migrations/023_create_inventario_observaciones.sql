-- Tabla para almacenar observaciones de inventario realizadas por técnicos
CREATE TABLE IF NOT EXISTS inventario_observaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activo_id INT NOT NULL,
    observaciones TEXT NOT NULL,
    realizado_por_id INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activo_id) REFERENCES activos(id) ON DELETE CASCADE,
    FOREIGN KEY (realizado_por_id) REFERENCES users(id)
);

CREATE INDEX idx_inv_obs_activo ON inventario_observaciones(activo_id);
CREATE INDEX idx_inv_obs_fecha ON inventario_observaciones(fecha_creacion);
