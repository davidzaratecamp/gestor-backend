const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

async function createTecnicoVillavicencio() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    try {
        console.log('🔄 Creando técnico de Villavicencio...');
        
        // Verificar si ya existe
        const [existingUser] = await connection.execute(
            'SELECT username FROM users WHERE username = ?',
            ['tecnico_vvc']
        );

        if (existingUser.length > 0) {
            console.log('ℹ️ El técnico de Villavicencio ya existe');
            return;
        }

        // Hash de la contraseña
        const password = 'tecnico123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear el usuario técnico
        await connection.execute(`
            INSERT INTO users (username, password, full_name, role, sede, departamento)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            'tecnico_vvc',
            hashedPassword,
            'Carlos Martinez (Técnico VVC)',
            'technician',
            'villavicencio',
            'claro'
        ]);

        console.log('✅ Técnico de Villavicencio creado exitosamente');
        console.log('📋 Datos del técnico:');
        console.log('   👤 Usuario: tecnico_vvc');
        console.log('   🔑 Contraseña: tecnico123');
        console.log('   📍 Sede: Villavicencio');
        console.log('   🏢 Rol: Técnico');

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    createTecnicoVillavicencio()
        .then(() => console.log('\n🎉 Técnico de Villavicencio creado'))
        .catch(error => {
            console.error('💥 Error crítico:', error.message);
            process.exit(1);
        });
}

module.exports = createTecnicoVillavicencio;