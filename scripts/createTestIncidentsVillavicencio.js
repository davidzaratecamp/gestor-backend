const db = require('../config/db');

async function createTestIncidentsVillavicencio() {
    try {
        console.log('Creando incidencias de prueba para Villavicencio...\n');
        
        // Buscar el coordinador de Villavicencio
        const [coordinadores] = await db.query(
            'SELECT id FROM users WHERE username = ?', 
            ['coordinador_villa']
        );
        
        if (coordinadores.length === 0) {
            console.log('❌ No se encontró el coordinador de Villavicencio');
            return;
        }
        
        const coordinadorId = coordinadores[0].id;
        
        // Crear estaciones de trabajo de Villavicencio
        const estaciones = [
            { code: 'V001', dept: 'claro' },
            { code: 'V002', dept: 'obama' },
            { code: 'V003', dept: 'majority' }
        ];
        
        const workstationIds = [];
        
        for (const estacion of estaciones) {
            // Verificar si ya existe
            const [existing] = await db.query(
                'SELECT id FROM workstations WHERE station_code = ?',
                [estacion.code]
            );
            
            if (existing.length > 0) {
                workstationIds.push(existing[0].id);
                console.log(`✓ Estación ${estacion.code} ya existe`);
            } else {
                const [result] = await db.query(`
                    INSERT INTO workstations (station_code, location_details, sede, departamento)
                    VALUES (?, ?, 'villavicencio', ?)
                `, [estacion.code, `Puesto ${estacion.code} - Villavicencio`, estacion.dept]);
                
                workstationIds.push(result.insertId);
                console.log(`✓ Estación ${estacion.code} creada`);
            }
        }
        
        // Crear incidencias
        const incidencias = [
            { 
                workstation_id: workstationIds[0], 
                failure_type: 'pantalla',
                description: 'Pantalla no enciende en Villavicencio',
                status: 'pendiente'
            },
            { 
                workstation_id: workstationIds[1], 
                failure_type: 'internet',
                description: 'Sin conectividad en estación Obama Villavicencio',
                status: 'en_proceso'
            },
            { 
                workstation_id: workstationIds[2], 
                failure_type: 'perifericos',
                description: 'Teclado no funciona - Majority Villavicencio',
                status: 'aprobado'
            }
        ];
        
        for (let i = 0; i < incidencias.length; i++) {
            const inc = incidencias[i];
            
            // Verificar si ya existe una incidencia similar
            const [existing] = await db.query(`
                SELECT id FROM incidents 
                WHERE workstation_id = ? AND description = ?
            `, [inc.workstation_id, inc.description]);
            
            if (existing.length === 0) {
                await db.query(`
                    INSERT INTO incidents (workstation_id, reported_by_id, failure_type, description, status, created_at)
                    VALUES (?, ?, ?, ?, ?, NOW())
                `, [inc.workstation_id, coordinadorId, inc.failure_type, inc.description, inc.status]);
                
                console.log(`✓ Incidencia ${i+1} creada: ${inc.description}`);
            } else {
                console.log(`⚠️ Incidencia ${i+1} ya existe: ${inc.description}`);
            }
        }
        
        console.log('\n✅ Incidencias de prueba para Villavicencio creadas');
        console.log('🎯 Ahora el coordinador de Villavicencio debería ver estas incidencias');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

createTestIncidentsVillavicencio();