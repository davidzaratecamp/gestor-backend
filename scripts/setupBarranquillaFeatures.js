const addRemoteWorkFields = require('./addRemoteWorkFields');
const createCoordinadorBarranquilla = require('./createCoordinadorBarranquilla');

async function setupBarranquillaFeatures() {
    console.log('🚀 Configurando funcionalidades de Barranquilla...\n');
    
    try {
        console.log('📋 Paso 1: Agregando campos de trabajo remoto a workstations...');
        await addRemoteWorkFields();
        console.log('✅ Campos agregados correctamente\n');
        
        console.log('📋 Paso 2: Creando coordinador de Barranquilla...');
        await createCoordinadorBarranquilla();
        console.log('✅ Coordinador creado correctamente\n');
        
        console.log('🎉 ¡Configuración completada exitosamente!\n');
        console.log('📋 Resumen de cambios:');
        console.log('   ✅ Agregados campos anydesk_address y advisor_cedula a workstations');
        console.log('   ✅ Creado coordinador de Barranquilla (usuario: coord_barranquilla, password: coord123)');
        console.log('   ✅ Creadas workstations de ejemplo para Barranquilla con datos remotos');
        console.log('\n🔧 Funcionalidades disponibles:');
        console.log('   📍 Coordinador de Barranquilla puede crear incidencias');
        console.log('   📍 Admin puede crear incidencias para cualquier sede');
        console.log('   📍 Incidencias de Barranquilla requieren AnyDesk y cédula del asesor');
        console.log('   📍 Frontend muestra campos especiales para trabajo remoto');
        console.log('\n🔑 Credenciales del coordinador:');
        console.log('   👤 Usuario: coord_barranquilla');
        console.log('   🔐 Contraseña: coord123');
        
    } catch (error) {
        console.error('❌ Error durante la configuración:', error.message);
        process.exit(1);
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    setupBarranquillaFeatures()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('💥 Error crítico:', error.message);
            process.exit(1);
        });
}

module.exports = setupBarranquillaFeatures;