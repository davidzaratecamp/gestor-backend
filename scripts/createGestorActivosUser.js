const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'call_center_support'
};

async function createGestorActivosUser() {
    let connection;
    
    try {
        console.log('🔗 Conectando a la base de datos...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexión establecida');

        // Verificar si el usuario ya existe
        const [existingUsers] = await connection.execute(
            'SELECT id FROM users WHERE username = ?',
            ['gestorActivos']
        );

        if (existingUsers.length > 0) {
            console.log('⚠️  El usuario gestorActivos ya existe');
            return;
        }

        // Hash de la contraseña
        const password = 'gestor123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear el usuario gestor de activos
        const [result] = await connection.execute(
            `INSERT INTO users (username, password, full_name, role) 
             VALUES (?, ?, ?, ?)`,
            ['gestorActivos', hashedPassword, 'Gestor de Activos', 'gestorActivos']
        );

        console.log('✅ Usuario gestor de activos creado exitosamente:');
        console.log('   - ID:', result.insertId);
        console.log('   - Username: gestorActivos');
        console.log('   - Password: gestor123');
        console.log('   - Nombre: Gestor de Activos');
        console.log('   - Rol: gestorActivos');
        console.log('');
        console.log('🎯 El usuario puede acceder al sistema con estas credenciales');
        console.log('📱 Al hacer login, será redirigido automáticamente al módulo de gestión de activos');

    } catch (error) {
        console.error('❌ Error al crear usuario gestor de activos:', error.message);
        
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log('💡 Consejo: Parece que la tabla users no existe. Ejecuta primero las migraciones de la base de datos.');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('💡 Consejo: La base de datos no existe. Crea primero la base de datos call_center_support.');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('💡 Consejo: No se puede conectar a MySQL. Verifica que el servidor esté ejecutándose.');
        }
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔒 Conexión cerrada');
        }
    }
}

// Ejecutar el script
createGestorActivosUser();