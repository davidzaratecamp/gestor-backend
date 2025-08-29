const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

async function createJefesOperaciones() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    try {
        console.log('🔄 Creando jefes de operaciones...');
        
        // Lista de jefes de operaciones por sede y departamento
        const jefes = [
            {
                username: 'jefe_claro_bogota',
                full_name: 'María González (Jefe Claro Bogotá)',
                sede: 'bogota',
                departamento: 'claro',
                password: 'jefe123'
            },
            {
                username: 'jefe_obama_bogota', 
                full_name: 'Carlos Rodríguez (Jefe Obama Bogotá)',
                sede: 'bogota',
                departamento: 'obama',
                password: 'jefe123'
            },
            {
                username: 'jefe_majority_bogota',
                full_name: 'Ana Martínez (Jefe Majority Bogotá)',
                sede: 'bogota',
                departamento: 'majority',
                password: 'jefe123'
            },
            {
                username: 'jefe_claro_barranquilla',
                full_name: 'Luis Herrera (Jefe Claro Barranquilla)',
                sede: 'barranquilla',
                departamento: 'claro',
                password: 'jefe123'
            },
            {
                username: 'jefe_obama_barranquilla',
                full_name: 'Patricia Silva (Jefe Obama Barranquilla)',
                sede: 'barranquilla',
                departamento: 'obama',
                password: 'jefe123'
            },
            {
                username: 'jefe_claro_villavicencio',
                full_name: 'Roberto Castro (Jefe Claro Villavicencio)',
                sede: 'villavicencio',
                departamento: 'claro',
                password: 'jefe123'
            },
            {
                username: 'jefe_obama_villavicencio',
                full_name: 'Sandra Moreno (Jefe Obama Villavicencio)',
                sede: 'villavicencio',
                departamento: 'obama',
                password: 'jefe123'
            }
        ];

        for (const jefe of jefes) {
            // Verificar si ya existe
            const [existingUser] = await connection.execute(
                'SELECT username FROM users WHERE username = ?',
                [jefe.username]
            );

            if (existingUser.length > 0) {
                console.log(`ℹ️ ${jefe.username} ya existe, saltando...`);
                continue;
            }

            // Hash de la contraseña
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(jefe.password, salt);

            // Crear el usuario jefe de operaciones
            await connection.execute(`
                INSERT INTO users (username, password, full_name, role, sede, departamento)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                jefe.username,
                hashedPassword,
                jefe.full_name,
                'jefe_operaciones',
                jefe.sede,
                jefe.departamento
            ]);

            console.log(`✅ ${jefe.username} creado exitosamente`);
        }

        console.log('\n📋 Resumen de Jefes de Operaciones:');
        console.log('=====================================');
        
        jefes.forEach(jefe => {
            console.log(`👤 ${jefe.username}`);
            console.log(`   🔑 Contraseña: ${jefe.password}`);
            console.log(`   📍 ${jefe.sede.toUpperCase()} - ${jefe.departamento.toUpperCase()}`);
            console.log(`   👥 Ve incidencias de coordinadores de ${jefe.departamento} en ${jefe.sede}`);
            console.log('');
        });

        console.log('📝 Nota: Los jefes de operaciones pueden:');
        console.log('   • Ver incidencias de su departamento específico en su sede');
        console.log('   • Supervisar el work de coordinadores de su departamento');
        console.log('   • Aprobar/rechazar incidencias reportadas por sus coordinadores');

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    createJefesOperaciones()
        .then(() => console.log('\n🎉 Jefes de operaciones creados exitosamente'))
        .catch(error => {
            console.error('💥 Error crítico:', error.message);
            process.exit(1);
        });
}

module.exports = createJefesOperaciones;