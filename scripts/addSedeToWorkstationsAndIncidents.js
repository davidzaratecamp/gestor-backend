const mysql = require('mysql2/promise');

async function addSedeToWorkstationsAndIncidents() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Nokialumia9810',
        database: 'call_center_support'
    });

    try {
        console.log('🔄 Agregando columnas sede y departamento a workstations...');
        
        // Agregar sede y departamento a workstations
        await connection.execute(`
            ALTER TABLE workstations 
            ADD COLUMN sede ENUM('bogota', 'barranquilla', 'villavicencio') DEFAULT 'bogota',
            ADD COLUMN departamento ENUM('claro', 'majority', 'obama') DEFAULT 'claro'
        `);
        
        console.log('✅ Columnas agregadas a workstations exitosamente');

        // Actualizar workstations existentes
        console.log('🔄 Actualizando workstations existentes...');
        
        // Asignar distribución realista a estaciones existentes
        const workstations = await connection.execute('SELECT id, station_code FROM workstations');
        
        for (const workstation of workstations[0]) {
            let sede = 'bogota';
            let departamento = 'claro';
            
            // Distribución por código de estación
            const stationNum = parseInt(workstation.station_code.replace(/\D/g, '')) || 0;
            
            // Distribución por sedes
            if (stationNum % 7 === 0) {
                sede = 'barranquilla';
                departamento = stationNum % 2 === 0 ? 'claro' : 'obama'; // No majority en Barranquilla
            } else if (stationNum % 5 === 0) {
                sede = 'villavicencio';
                departamento = stationNum % 2 === 0 ? 'claro' : 'obama'; // No majority en Villavicencio
            } else {
                sede = 'bogota';
                // En Bogotá sí hay Majority
                if (stationNum % 3 === 0) departamento = 'majority';
                else if (stationNum % 2 === 0) departamento = 'claro';
                else departamento = 'obama';
            }
            
            await connection.execute(
                'UPDATE workstations SET sede = ?, departamento = ? WHERE id = ?',
                [sede, departamento, workstation.id]
            );
        }
        
        console.log('✅ Workstations actualizadas exitosamente');
        
        // Mostrar distribución
        const distribution = await connection.execute(`
            SELECT sede, departamento, COUNT(*) as count 
            FROM workstations 
            GROUP BY sede, departamento 
            ORDER BY sede, departamento
        `);
        
        console.log('📊 Distribución de workstations:');
        for (const row of distribution[0]) {
            console.log(`   ${row.sede.toUpperCase()} - ${row.departamento.toUpperCase()}: ${row.count} estaciones`);
        }

    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️ Las columnas sede y departamento ya existen en workstations');
        } else {
            console.error('❌ Error:', error.message);
        }
    } finally {
        await connection.end();
    }
}

// Ejecutar el script
addSedeToWorkstationsAndIncidents();