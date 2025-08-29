const mysql = require('mysql2/promise');

async function addSedeAndDepartamento() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Nokialumia9810',
        database: 'call_center_support'
    });

    try {
        console.log('🔄 Agregando columnas sede y departamento a la tabla users...');
        
        // Agregar columnas sede y departamento
        await connection.execute(`
            ALTER TABLE users 
            ADD COLUMN sede ENUM('bogota', 'barranquilla', 'villavicencio') DEFAULT 'bogota',
            ADD COLUMN departamento ENUM('claro', 'majority', 'obama') DEFAULT 'claro'
        `);
        
        console.log('✅ Columnas agregadas exitosamente');

        // Actualizar usuarios existentes con valores por defecto apropiados
        console.log('🔄 Actualizando usuarios existentes...');
        
        // Actualizar admin (pueden ver todo, asignar a Bogotá por defecto)
        await connection.execute(`
            UPDATE users 
            SET sede = 'bogota', departamento = 'claro' 
            WHERE role = 'admin'
        `);
        
        // Actualizar supervisores (asignar a Bogotá por defecto)
        await connection.execute(`
            UPDATE users 
            SET sede = 'bogota', departamento = 'claro' 
            WHERE role = 'supervisor'
        `);
        
        // Actualizar técnicos existentes
        await connection.execute(`
            UPDATE users 
            SET sede = 'bogota', departamento = 'claro' 
            WHERE role = 'technician'
        `);
        
        console.log('✅ Usuarios actualizados exitosamente');
        console.log('📝 Nota: Todos los usuarios fueron asignados a Bogotá-Claro por defecto');
        console.log('   Puedes cambiar estas asignaciones desde el panel de administración');

    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️ Las columnas sede y departamento ya existen');
        } else {
            console.error('❌ Error:', error.message);
        }
    } finally {
        await connection.end();
    }
}

// Ejecutar el script
addSedeAndDepartamento();