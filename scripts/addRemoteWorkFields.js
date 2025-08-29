const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function addRemoteWorkFields() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    try {
        console.log('🔄 Agregando campos de trabajo remoto a workstations...');
        
        // Agregar campos para trabajo remoto en Barranquilla
        await connection.execute(`
            ALTER TABLE workstations 
            ADD COLUMN anydesk_address VARCHAR(255) NULL COMMENT 'Dirección AnyDesk para trabajo remoto',
            ADD COLUMN advisor_cedula VARCHAR(20) NULL COMMENT 'Cédula del asesor que usa el PC remoto'
        `);
        
        console.log('✅ Campos de trabajo remoto agregados exitosamente');

        // Actualizar workstations de Barranquilla con datos de ejemplo
        console.log('🔄 Agregando datos de ejemplo para workstations de Barranquilla...');
        
        const barranquillaStations = await connection.execute(
            'SELECT id, station_code FROM workstations WHERE sede = "barranquilla"'
        );
        
        let counter = 1;
        for (const station of barranquillaStations[0]) {
            const anydeskAddress = `${900000000 + counter}`;
            const advisorCedula = `${30000000 + counter}`;
            
            await connection.execute(
                'UPDATE workstations SET anydesk_address = ?, advisor_cedula = ? WHERE id = ?',
                [anydeskAddress, advisorCedula, station.id]
            );
            
            console.log(`   📍 ${station.station_code}: AnyDesk ${anydeskAddress}, Asesor ${advisorCedula}`);
            counter++;
        }
        
        console.log('✅ Datos de ejemplo agregados para Barranquilla');

    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️ Los campos de trabajo remoto ya existen en workstations');
        } else {
            console.error('❌ Error:', error.message);
        }
    } finally {
        await connection.end();
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    addRemoteWorkFields();
}

module.exports = addRemoteWorkFields;