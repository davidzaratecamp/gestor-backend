const mysql = require('mysql2/promise');
require('dotenv').config();

async function addIncidentAttachments() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'call_center_support'
    });

    try {
        console.log('Conectado a la base de datos MySQL');
        
        // Crear tabla incident_attachments
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS incident_attachments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                incident_id INT NOT NULL,
                filename VARCHAR(255) NOT NULL,
                original_name VARCHAR(255) NOT NULL,
                file_type VARCHAR(100) NOT NULL,
                file_size INT NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                uploaded_by INT NOT NULL,
                FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
                FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
            )
        `;
        
        await connection.execute(createTableQuery);
        console.log('✅ Tabla incident_attachments creada exitosamente');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

addIncidentAttachments();