const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function createTestIncidentsAllSedes() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    try {
        console.log('🔄 Creando incidencias de prueba para todas las sedes...');

        // Obtener usuarios para reportar incidencias
        const [users] = await connection.execute(`
            SELECT id, username, full_name, sede, role 
            FROM users 
            WHERE role IN ('admin', 'supervisor', 'coordinador')
        `);

        const admin = users.find(u => u.role === 'admin');
        const coordinator = users.find(u => u.role === 'coordinador' && u.sede === 'barranquilla');
        const supervisor = users.find(u => u.role === 'supervisor');

        console.log('👥 Usuarios encontrados:');
        console.log(`   Admin: ${admin?.full_name} (${admin?.username})`);
        console.log(`   Coordinador Barranquilla: ${coordinator?.full_name} (${coordinator?.username})`);
        console.log(`   Supervisor: ${supervisor?.full_name} (${supervisor?.username})`);

        // Crear workstations si no existen
        const workstations = [
            // Bogotá
            { code: 'O001', sede: 'bogota', dept: 'obama', details: 'Puesto Obama 1' },
            { code: 'C002', sede: 'bogota', dept: 'claro', details: 'Puesto Claro 2' },
            { code: 'M003', sede: 'bogota', dept: 'majority', details: 'Puesto Majority 3' },
            
            // Villavicencio
            { code: 'VVC-O001', sede: 'villavicencio', dept: 'obama', details: 'Puesto Obama Villavicencio 1' },
            { code: 'VVC-C002', sede: 'villavicencio', dept: 'claro', details: 'Puesto Claro Villavicencio 2' },
            
            // Barranquilla (con datos remotos)
            { code: 'BAQ-O001', sede: 'barranquilla', dept: 'obama', details: 'Puesto Obama Barranquilla 1 (Remoto)', anydesk: '900111111', cedula: '30111111' },
            { code: 'BAQ-C002', sede: 'barranquilla', dept: 'claro', details: 'Puesto Claro Barranquilla 2 (Remoto)', anydesk: '900222222', cedula: '30222222' }
        ];

        for (const ws of workstations) {
            // Verificar si ya existe
            const [existing] = await connection.execute(
                'SELECT id FROM workstations WHERE station_code = ?',
                [ws.code]
            );

            if (existing.length === 0) {
                let query, values;
                if (ws.sede === 'barranquilla') {
                    query = `INSERT INTO workstations (station_code, location_details, sede, departamento, anydesk_address, advisor_cedula) 
                             VALUES (?, ?, ?, ?, ?, ?)`;
                    values = [ws.code, ws.details, ws.sede, ws.dept, ws.anydesk, ws.cedula];
                } else {
                    query = `INSERT INTO workstations (station_code, location_details, sede, departamento) 
                             VALUES (?, ?, ?, ?)`;
                    values = [ws.code, ws.details, ws.sede, ws.dept];
                }
                
                await connection.execute(query, values);
                console.log(`   ✅ Workstation ${ws.code} creada en ${ws.sede}`);
            }
        }

        // Obtener IDs de workstations
        const [workstationIds] = await connection.execute(
            'SELECT id, station_code, sede FROM workstations WHERE station_code IN (?, ?, ?, ?, ?, ?, ?)',
            ['O001', 'C002', 'M003', 'VVC-O001', 'VVC-C002', 'BAQ-O001', 'BAQ-C002']
        );

        // Crear incidencias de prueba
        const incidentsToCreate = [
            // Incidencias de Bogotá
            { workstation: 'O001', reporter: admin?.id, type: 'pantalla', desc: 'Pantalla parpadea en Bogotá Obama' },
            { workstation: 'C002', reporter: admin?.id, type: 'internet', desc: 'Internet lento en Bogotá Claro' },
            { workstation: 'M003', reporter: supervisor?.id, type: 'software', desc: 'Software se cierra en Bogotá Majority' },
            
            // Incidencias de Villavicencio
            { workstation: 'VVC-O001', reporter: admin?.id, type: 'perifericos', desc: 'Mouse no funciona en Villavicencio Obama' },
            { workstation: 'VVC-C002', reporter: admin?.id, type: 'pantalla', desc: 'Monitor sin imagen en Villavicencio Claro' },
            
            // Incidencias de Barranquilla
            { workstation: 'BAQ-O001', reporter: coordinator?.id, type: 'internet', desc: 'Conexión remota inestable en Barranquilla Obama' },
            { workstation: 'BAQ-C002', reporter: coordinator?.id, type: 'software', desc: 'AnyDesk no conecta en Barranquilla Claro' }
        ];

        let createdCount = 0;
        for (const inc of incidentsToCreate) {
            if (!inc.reporter) continue;

            const workstation = workstationIds.find(w => w.station_code === inc.workstation);
            if (!workstation) continue;

            await connection.execute(`
                INSERT INTO incidents (workstation_id, reported_by_id, failure_type, description, status)
                VALUES (?, ?, ?, ?, 'pendiente')
            `, [workstation.id, inc.reporter, inc.type, inc.desc]);

            console.log(`   📋 Incidencia creada: ${inc.workstation} (${workstation.sede}) - ${inc.type}`);
            createdCount++;
        }

        console.log(`✅ Se crearon ${createdCount} incidencias de prueba`);
        
        // Mostrar resumen por sede
        const [summary] = await connection.execute(`
            SELECT 
                w.sede,
                COUNT(*) as total_incidencias,
                COUNT(CASE WHEN i.status = 'pendiente' THEN 1 END) as pendientes
            FROM incidents i
            JOIN workstations w ON i.workstation_id = w.id
            GROUP BY w.sede
            ORDER BY w.sede
        `);

        console.log('\n📊 Resumen de incidencias por sede:');
        for (const row of summary) {
            console.log(`   ${row.sede.toUpperCase()}: ${row.total_incidencias} total, ${row.pendientes} pendientes`);
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
    createTestIncidentsAllSedes()
        .then(() => {
            console.log('\n🎉 ¡Incidencias de prueba creadas exitosamente!');
            console.log('\n🔧 Ahora puedes probar:');
            console.log('   👤 Ingresar como coordinador de Barranquilla (coord_barranquilla/coord123)');
            console.log('   👀 Verificar que solo vea incidencias de Barranquilla');
            console.log('   👤 Ingresar como técnico de Bogotá (tecnico1/tecnico123)'); 
            console.log('   👀 Verificar que vea incidencias de Bogotá y Barranquilla');
        })
        .catch(error => {
            console.error('💥 Error crítico:', error.message);
            process.exit(1);
        });
}

module.exports = createTestIncidentsAllSedes;