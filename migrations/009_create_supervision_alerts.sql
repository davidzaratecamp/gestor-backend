-- Crear tabla para alertas de supervisión
CREATE TABLE IF NOT EXISTS supervision_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sent_by_id INT NOT NULL,
    sent_to_id INT NOT NULL,
    message TEXT NOT NULL,
    incident_ids JSON,
    status ENUM('sent', 'read', 'dismissed') DEFAULT 'sent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (sent_by_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sent_to_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sent_to_status (sent_to_id, status),
    INDEX idx_created_at (created_at)
);