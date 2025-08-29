const bcrypt = require('bcryptjs');
const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

const users = [
    {
        username: 'david',
        password: 'admin123',
        full_name: 'David (Administrador)',
        role: 'admin'
    },
    {
        username: 'kevin',
        password: 'supervisor123',
        full_name: 'Kevin (Supervisor)',
        role: 'supervisor'
    },
    {
        username: 'tecnico1',
        password: 'tecnico123',
        full_name: 'Juan Perez (Técnico)',
        role: 'technician'
    },
    {
        username: 'tecnico2',
        password: 'tecnico123',
        full_name: 'Ana Lopez (Técnica)',
        role: 'technician'
    }
];

async function insertUsers() {
    try {
        console.log('Iniciando inserción de usuarios...');
        
        for (const user of users) {
            // Hash de la contraseña
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(user.password, salt);
            
            // Insertar usuario
            const query = 'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE password = VALUES(password), full_name = VALUES(full_name), role = VALUES(role)';
            
            connection.execute(query, [user.username, hashedPassword, user.full_name, user.role], (err, results) => {
                if (err) {
                    console.error(`Error insertando usuario ${user.username}:`, err);
                } else {
                    console.log(`✅ Usuario ${user.username} insertado/actualizado correctamente`);
                }
            });
        }
        
        setTimeout(() => {
            console.log('\n🎉 Proceso completado!');
            console.log('\nUsuarios creados:');
            console.log('- Administrador: david / admin123');
            console.log('- Supervisor: kevin / supervisor123');
            console.log('- Técnico 1: tecnico1 / tecnico123');
            console.log('- Técnico 2: tecnico2 / tecnico123');
            
            connection.end();
        }, 2000);
        
    } catch (error) {
        console.error('Error en el proceso:', error);
        connection.end();
    }
}

insertUsers();