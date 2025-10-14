const db = require('../config/db');
const bcrypt = require('bcryptjs');

const createHannyUser = async () => {
    try {
        // Verificar si ya existe
        const [existingUsers] = await db.query('SELECT * FROM users WHERE username = ?', ['hannycita10']);
        
        if (existingUsers.length > 0) {
            console.log('✅ Usuario hannycita10 ya existe con ID:', existingUsers[0].id);
            console.log('Datos:', {
                username: existingUsers[0].username,
                full_name: existingUsers[0].full_name,
                role: existingUsers[0].role,
                sede: existingUsers[0].sede
            });
            return;
        }

        // Crear nuevo usuario
        const password = 'hannyasiste1010';
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await db.query(
            'INSERT INTO users (username, password, full_name, role, sede, departamento) VALUES (?, ?, ?, ?, ?, ?)',
            ['hannycita10', hashedPassword, 'Hanny Administradora', 'admin', 'bogota', 'claro']
        );
        
        console.log('✅ Usuario Hanny creado exitosamente con ID:', result.insertId);
        console.log('Username: hannycita10');
        console.log('Password: hannyasiste1010');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
};

createHannyUser();