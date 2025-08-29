const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

async function createHannyUser() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    try {
        console.log('🔄 Creando usuario admin Hanny...');
        
        const userData = {
            username: 'hannycita10',
            full_name: 'Hanny Admin',
            password: 'hannyasiste1010',
            role: 'admin',
            sede: 'bogota',
            departamento: null
        };

        // Verificar si ya existe
        const [existingUser] = await connection.execute(
            'SELECT username FROM users WHERE username = ?',
            [userData.username]
        );

        if (existingUser.length > 0) {
            console.log(`ℹ️ ${userData.username} ya existe, saltando...`);
            return;
        }

        // Hash de la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);

        // Crear el usuario admin
        await connection.execute(`
            INSERT INTO users (username, password, full_name, role, sede, departamento)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            userData.username,
            hashedPassword,
            userData.full_name,
            userData.role,
            userData.sede,
            userData.departamento
        ]);

        console.log(`✅ ${userData.username} creado exitosamente`);
        console.log('\n💜 Credenciales de Hanny:');
        console.log('=====================================');
        console.log(`👤 Usuario: ${userData.username}`);
        console.log(`🔑 Contraseña: ${userData.password}`);
        console.log(`👑 Rol: ${userData.role}`);
        console.log(`📍 Sede: ${userData.sede}`);
        console.log(`💖 Tema especial: Negro y morado activado`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    createHannyUser()
        .then(() => console.log('\n🎉 Usuario Hanny creado exitosamente'))
        .catch(error => {
            console.error('💥 Error crítico:', error.message);
            process.exit(1);
        });
}

module.exports = createHannyUser;