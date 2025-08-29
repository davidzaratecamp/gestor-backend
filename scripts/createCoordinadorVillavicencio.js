const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function createCoordinadorVillavicencio() {
    try {
        console.log('Creando usuario coordinador para Villavicencio...');
        
        // Datos del coordinador
        const userData = {
            username: 'coordinador_villa',
            password: 'coordinador123',
            full_name: 'Coordinador Villavicencio',
            role: 'coordinador',
            sede: 'villavicencio',
            departamento: 'claro'
        };
        
        // Hash de la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);
        
        // Verificar si ya existe
        const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [userData.username]);
        if (existing.length > 0) {
            console.log('⚠️  Usuario ya existe, actualizando...');
            await db.query(
                'UPDATE users SET password = ?, full_name = ?, role = ?, sede = ?, departamento = ? WHERE username = ?',
                [hashedPassword, userData.full_name, userData.role, userData.sede, userData.departamento, userData.username]
            );
        } else {
            // Crear nuevo usuario
            await db.query(
                'INSERT INTO users (username, password, full_name, role, sede, departamento) VALUES (?, ?, ?, ?, ?, ?)',
                [userData.username, hashedPassword, userData.full_name, userData.role, userData.sede, userData.departamento]
            );
        }
        
        console.log('✅ Usuario coordinador creado exitosamente');
        console.log('📋 Datos de acceso:');
        console.log('   Usuario:', userData.username);
        console.log('   Contraseña:', userData.password);
        console.log('   Nombre:', userData.full_name);
        console.log('   Rol:', userData.role);
        console.log('   Sede:', userData.sede);
        console.log('   Departamento:', userData.departamento);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creando coordinador:', error);
        process.exit(1);
    }
}

createCoordinadorVillavicencio();