-- Agregar rol 'anonimo' al enum de roles
ALTER TABLE users 
MODIFY COLUMN role ENUM('admin', 'supervisor', 'coordinador', 'jefe_operaciones', 'technician', 'administrativo', 'anonimo') 
NOT NULL DEFAULT 'technician';

-- Crear tabla para mensajes de chat privado
CREATE TABLE IF NOT EXISTS private_chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_conversation (from_user_id, to_user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_unread (to_user_id, is_read)
);

-- Crear tabla para conversaciones activas
CREATE TABLE IF NOT EXISTS chat_conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    anonymous_user_id INT NOT NULL,
    admin_user_id INT NOT NULL,
    status ENUM('active', 'closed') DEFAULT 'active',
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (anonymous_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_conversation (anonymous_user_id, admin_user_id),
    INDEX idx_admin_conversations (admin_user_id, status),
    INDEX idx_last_message (last_message_at)
);