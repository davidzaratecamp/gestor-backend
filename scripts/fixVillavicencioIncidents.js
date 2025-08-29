const db = require('../config/db');

async function fixVillavicencioIncidents() {
    try {
        console.log('Corrigiendo incidencias de Villavicencio...\n');
        
        // Encontrar la estación V003 que tiene majority (incorrecto para Villavicencio)
        const [stations] = await db.query(`
            SELECT id, station_code, departamento 
            FROM workstations 
            WHERE sede = 'villavicencio' AND departamento = 'majority'
        `);
        
        if (stations.length > 0) {
            console.log('❌ Encontradas estaciones con majority en Villavicencio:');
            stations.forEach(station => {
                console.log(`   - ${station.station_code}: ${station.departamento}`);
            });
            
            // Cambiar V003 de majority a obama
            await db.query(`
                UPDATE workstations 
                SET departamento = 'obama' 
                WHERE sede = 'villavicencio' AND departamento = 'majority'
            `);
            
            console.log('✅ Corregidas estaciones: majority → obama');
        } else {
            console.log('✅ No hay estaciones con majority en Villavicencio');
        }
        
        // Verificar resultado final
        const [finalStations] = await db.query(`
            SELECT station_code, departamento 
            FROM workstations 
            WHERE sede = 'villavicencio'
            ORDER BY station_code
        `);
        
        console.log('\n📋 Estaciones finales en Villavicencio:');
        finalStations.forEach(station => {
            console.log(`   ✓ ${station.station_code}: ${station.departamento}`);
        });
        
        // También verificar que no hay usuarios con majority en Villavicencio
        const [users] = await db.query(`
            SELECT username, sede, departamento 
            FROM users 
            WHERE sede = 'villavicencio' AND departamento = 'majority'
        `);
        
        if (users.length > 0) {
            console.log('\n❌ Usuarios con majority en Villavicencio:');
            users.forEach(user => {
                console.log(`   - ${user.username}: ${user.departamento}`);
            });
            
            await db.query(`
                UPDATE users 
                SET departamento = 'claro' 
                WHERE sede = 'villavicencio' AND departamento = 'majority'
            `);
            
            console.log('✅ Corregidos usuarios: majority → claro');
        } else {
            console.log('\n✅ No hay usuarios con majority en Villavicencio');
        }
        
        console.log('\n🎯 Estructura correcta aplicada:');
        console.log('   - Bogotá: Obama, Majority, Claro');
        console.log('   - Villavicencio: Obama, Claro');
        console.log('   - Barranquilla: Obama, Claro');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixVillavicencioIncidents();