const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function updateRoleEnum() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    try {
        console.log('🔄 Verificando estructura de la tabla users...');
        
        // Ver la estructura actual de la tabla
        const [structure] = await connection.execute('DESCRIBE users');
        
        const roleField = structure.find(field => field.Field === 'role');
        console.log('📋 Campo role actual:', roleField);
        
        if (roleField && roleField.Type.includes("enum")) {
            console.log('🔄 Actualizando ENUM de role para incluir jefe_operaciones...');
            
            // Actualizar el ENUM para incluir el nuevo rol
            await connection.execute(`
                ALTER TABLE users 
                MODIFY COLUMN role ENUM('admin', 'supervisor', 'coordinador', 'jefe_operaciones', 'technician') 
                NOT NULL DEFAULT 'technician'
            `);
            
            console.log('✅ ENUM de role actualizado exitosamente');
        } else {
            console.log('ℹ️ El campo role no es un ENUM o no existe');
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
    updateRoleEnum()
        .then(() => console.log('\n🎉 Schema actualizado exitosamente'))
        .catch(error => {
            console.error('💥 Error crítico:', error.message);
            process.exit(1);
        });
}

module.exports = updateRoleEnum;