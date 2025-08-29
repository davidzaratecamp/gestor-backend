-- Crear tabla de calificaciones de técnicos
CREATE TABLE IF NOT EXISTS technician_ratings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    incident_id INT NOT NULL,
    technician_id INT NOT NULL,
    rated_by_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (rated_by_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_incident_rating (incident_id),
    INDEX idx_technician_ratings (technician_id),
    INDEX idx_rated_by (rated_by_id)
);