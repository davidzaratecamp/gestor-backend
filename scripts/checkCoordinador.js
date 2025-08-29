const db = require('../config/db');

async function checkCoordinador() {
    try {
        console.log('Verificando usuario coordinador...\n');
        
        // Buscar el coordinador de Villavicencio
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', ['coordinador_villa']);
        
        if (users.length === 0) {
            console.log('❌ No se encontró el usuario coordinador_villa');
            return;
        }
        
        const user = users[0];
        console.log('👤 Usuario encontrado:');
        console.log('   ID:', user.id);
        console.log('   Username:', user.username);
        console.log('   Full Name:', user.full_name);
        console.log('   Role:', user.role);
        console.log('   Sede:', user.sede);
        console.log('   Departamento:', user.departamento);
        console.log('   Created:', user.created_at);
        
        // Verificar otras información
        console.log('\n📋 Verificación:');
        console.log('   ✓ Rol correcto:', user.role === 'coordinador' ? 'SÍ' : 'NO');
        console.log('   ✓ Sede correcta:', user.sede === 'villavicencio' ? 'SÍ' : 'NO');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkCoordinador();