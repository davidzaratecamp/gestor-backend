const db = require('../config/db');

async function updateUserRoles() {
    try {
        console.log('Actualizando enum de roles en la tabla users...');
        
        // Actualizar el enum para incluir 'coordinador'
        const alterQuery = `
            ALTER TABLE users 
            MODIFY COLUMN role ENUM('admin','supervisor','coordinador','technician')
        `;
        
        await db.query(alterQuery);
        console.log('✅ Enum de roles actualizado exitosamente');
        
        // Verificar la estructura actualizada
        const [rows] = await db.query('DESCRIBE users');
        const roleColumn = rows.find(row => row.Field === 'role');
        console.log('📋 Nueva definición de role:', roleColumn.Type);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error actualizando roles:', error);
        process.exit(1);
    }
}

updateUserRoles();