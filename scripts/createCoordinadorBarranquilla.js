const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

async function createCoordinadorBarranquilla() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    try {
        console.log('🔄 Creando coordinador de Barranquilla...');
        
        // Verificar si ya existe
        const [existingUser] = await connection.execute(
            'SELECT username FROM users WHERE username = ?',
            ['coord_barranquilla']
        );

        if (existingUser.length > 0) {
            console.log('ℹ️ El coordinador de Barranquilla ya existe');
            return;
        }

        // Hash de la contraseña
        const password = 'coord123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear el usuario coordinador
        await connection.execute(`
            INSERT INTO users (username, password, full_name, role, sede, departamento)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            'coord_barranquilla',
            hashedPassword,
            'Coordinador Barranquilla',
            'coordinador',
            'barranquilla',
            'claro' // Departamento por defecto
        ]);

        console.log('✅ Coordinador de Barranquilla creado exitosamente');
        console.log('📋 Datos del coordinador:');
        console.log('   👤 Usuario: coord_barranquilla');
        console.log('   🔑 Contraseña: coord123');
        console.log('   📍 Sede: Barranquilla');
        console.log('   🏢 Rol: Coordinador');

        // Crear algunas workstations de ejemplo para Barranquilla si no existen
        console.log('🔄 Verificando workstations de Barranquilla...');
        
        const [barranquillaStations] = await connection.execute(
            'SELECT COUNT(*) as count FROM workstations WHERE sede = "barranquilla"'
        );

        if (barranquillaStations[0].count === 0) {
            console.log('🔄 Creando workstations de ejemplo para Barranquilla...');
            
            const stationsToCreate = [
                {
                    code: 'BAQ-001',
                    details: 'Workstation 1 - Remota',
                    anydesk: '900123456',
                    cedula: '32456789',
                    dept: 'claro'
                },
                {
                    code: 'BAQ-002',
                    details: 'Workstation 2 - Remota',
                    anydesk: '900123457',
                    cedula: '32456790',
                    dept: 'obama'
                },
                {
                    code: 'BAQ-003',
                    details: 'Workstation 3 - Remota',
                    anydesk: '900123458',
                    cedula: '32456791',
                    dept: 'claro'
                }
            ];

            for (const station of stationsToCreate) {
                await connection.execute(`
                    INSERT INTO workstations (station_code, location_details, sede, departamento, anydesk_address, advisor_cedula)
                    VALUES (?, ?, 'barranquilla', ?, ?, ?)
                `, [station.code, station.details, station.dept, station.anydesk, station.cedula]);
                
                console.log(`   📍 ${station.code}: AnyDesk ${station.anydesk}, Asesor ${station.cedula}`);
            }
            
            console.log('✅ Workstations de ejemplo creadas para Barranquilla');
        } else {
            console.log(`ℹ️ Ya existen ${barranquillaStations[0].count} workstations en Barranquilla`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    createCoordinadorBarranquilla()
        .then(() => console.log('🎉 Proceso completado'))
        .catch(error => {
            console.error('💥 Error en el proceso:', error.message);
            process.exit(1);
        });
}

module.exports = createCoordinadorBarranquilla;