const User = require('../models/User');
const db = require('../config/db');

async function createTestJefeOperaciones() {
    try {
        // Jefe de Operaciones de Bogotá - Claro
        const jefeBogotatClaro = await User.create({
            username: 'jefe_bogota_claro',
            password: 'jefe123',
            full_name: 'Jefe Operaciones Bogotá Claro',
            role: 'jefe_operaciones',
            sede: 'bogota',
            departamento: 'claro'
        });
        
        console.log('✅ Jefe de Operaciones Bogotá-Claro creado:', jefeBogotatClaro);

        // Jefe de Operaciones de Villavicencio - Obama
        const jefeVillavicencioObama = await User.create({
            username: 'jefe_villa_obama',
            password: 'jefe123',
            full_name: 'Jefe Operaciones Villavicencio Obama',
            role: 'jefe_operaciones',
            sede: 'villavicencio',
            departamento: 'obama'
        });
        
        console.log('✅ Jefe de Operaciones Villavicencio-Obama creado:', jefeVillavicencioObama);

        // Jefe de Operaciones de Bogotá - Obama
        const jefeBogotaObama = await User.create({
            username: 'jefe_bogota_obama',
            password: 'jefe123',
            full_name: 'Jefe Operaciones Bogotá Obama',
            role: 'jefe_operaciones',
            sede: 'bogota',
            departamento: 'obama'
        });
        
        console.log('✅ Jefe de Operaciones Bogotá-Obama creado:', jefeBogotaObama);

        console.log('\n🎯 Usuarios de prueba creados exitosamente');
        console.log('📋 Para probar:');
        console.log('   - jefe_bogota_claro / jefe123 (Bogotá - Claro)');
        console.log('   - jefe_villa_obama / jefe123 (Villavicencio - Obama)');
        console.log('   - jefe_bogota_obama / jefe123 (Bogotá - Obama)');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creando jefes de operaciones de prueba:', error);
        process.exit(1);
    }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
    createTestJefeOperaciones();
}

module.exports = { createTestJefeOperaciones };