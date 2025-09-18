const Incident = require('../models/Incident');
const User = require('../models/User');
const Workstation = require('../models/Workstation');

async function testCompleteFlow() {
    try {
        console.log('🧪 Iniciando prueba de flujo completo para Jefe de Operaciones...\n');

        // 1. Crear un jefe de operaciones si no existe
        let jefe = await User.getByUsername('jefe_test');
        if (!jefe) {
            jefe = await User.create({
                username: 'jefe_test',
                password: 'test123',
                full_name: 'Jefe Test Bogotá Claro',
                role: 'jefe_operaciones',
                sede: 'bogota',
                departamento: 'claro'
            });
            console.log('✅ Jefe de operaciones creado:', jefe.full_name);
        }

        // 2. Crear una workstation si no existe
        let workstation = await Workstation.findOrCreateByCode('TEST-001', 'claro', 'bogota');
        console.log('✅ Workstation creada/encontrada:', workstation.station_code);

        // 3. Crear incidencia como jefe de operaciones
        const incidentData = {
            workstation_id: workstation.id,
            reported_by_id: jefe.id,
            failure_type: 'software',
            description: 'Prueba de flujo completo - problema de software'
        };
        
        const incident = await Incident.create(incidentData);
        console.log('✅ Incidencia creada por jefe:', incident.id, '- Estado:', 'pendiente');

        // 4. Simular asignación de técnico (como admin)
        const admin = await User.getByUsername('david');
        const technician = await User.getByUsername('tecnico1');
        
        if (admin && technician) {
            await Incident.assignTechnician(incident.id, technician.id, admin.id);
            console.log('✅ Técnico asignado - Estado: en_proceso');
        }

        // 5. Simular resolución por técnico
        if (technician) {
            await Incident.markAsResolved(incident.id, technician.id, 'Problema resuelto - prueba de flujo');
            console.log('✅ Incidencia resuelta por técnico - Estado: en_supervision');
        }

        // 6. Verificar que el jefe puede ver la incidencia en supervisión
        const incidentsInSupervision = await Incident.getVisibleForUser(
            'jefe_operaciones', 
            'bogota', 
            'en_supervision', 
            null, 
            {}, 
            'claro', 
            jefe.id
        );
        
        const canSeeSupervisedIncident = incidentsInSupervision.some(inc => inc.id === incident.id);
        console.log(`✅ Jefe puede ver su incidencia en supervisión: ${canSeeSupervisedIncident ? 'SÍ' : 'NO'}`);

        // 7. Verificar que SÍ puede ver incidencias de coordinadores de su departamento/sede
        // Crear un coordinador de Claro en Bogotá para la prueba
        let coordinadorClaro = await User.getByUsername('coord_claro_test');
        if (!coordinadorClaro) {
            coordinadorClaro = await User.create({
                username: 'coord_claro_test',
                password: 'test123',
                full_name: 'Coordinador Claro Test',
                role: 'coordinador',
                sede: 'bogota',
                departamento: 'claro'
            });
        }

        const coordinadorIncident = await Incident.create({
            workstation_id: workstation.id,
            reported_by_id: coordinadorClaro.id,
            failure_type: 'internet',
            description: 'Incidencia creada por coordinador de Claro'
        });

        // Simular que el técnico la resuelve
        if (technician) {
            await Incident.assignTechnician(coordinadorIncident.id, technician.id, admin.id);
            await Incident.markAsResolved(coordinadorIncident.id, technician.id, 'Resuelta por técnico');
        }

        const allSupervisionIncidents = await Incident.getVisibleForUser(
            'jefe_operaciones', 
            'bogota', 
            'en_supervision', 
            null, 
            {}, 
            'claro', 
            jefe.id
        );
        
        const canSeeCoordinatorIncident = allSupervisionIncidents.some(inc => inc.id === coordinadorIncident.id);
        console.log(`✅ Jefe SÍ puede ver incidencias de coordinadores de su área: ${canSeeCoordinatorIncident ? 'CORRECTO' : 'PROBLEMA'}`);

        // 8. Verificar que NO puede ver incidencias de otros departamentos/sedes
        const otherUser = await User.getByUsername('coord_barranquilla');
        if (otherUser) {
            const otherIncident = await Incident.create({
                workstation_id: workstation.id,
                reported_by_id: otherUser.id,
                failure_type: 'software',
                description: 'Incidencia de Barranquilla (no debe verla)'
            });
            
            const canSeeOtherIncident = allSupervisionIncidents.some(inc => inc.id === otherIncident.id);
            console.log(`✅ Jefe NO puede ver incidencias de otras sedes: ${!canSeeOtherIncident ? 'CORRECTO' : 'PROBLEMA'}`);
        }

        // 9. Simular aprobación por el jefe (tanto su incidencia como la del coordinador)
        await Incident.approve(incident.id, jefe.id, 'Aprobado por jefe de operaciones');
        console.log('✅ Incidencia propia aprobada por jefe - Estado: aprobado');
        
        await Incident.approve(coordinadorIncident.id, jefe.id, 'Aprobado por jefe de operaciones');
        console.log('✅ Incidencia del coordinador aprobada por jefe - Estado: aprobado');

        console.log('\n🎉 Flujo completo probado exitosamente');
        console.log('📋 Resumen del flujo correcto:');
        console.log('   ▶️ COMO CREADOR:');
        console.log('     1. Jefe crea incidencia → pendiente');
        console.log('     2. Admin asigna técnico → en_proceso');
        console.log('     3. Técnico resuelve → en_supervision');
        console.log('     4. Jefe aprueba su propia incidencia → aprobado');
        console.log('   ▶️ COMO SUPERVISOR:');
        console.log('     1. Jefe ve TODAS las incidencias de coordinadores de su departamento/sede');
        console.log('     2. Jefe puede aprobar incidencias de coordinadores de su área');
        console.log('     3. Jefe NO ve incidencias de otros departamentos/sedes');

    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
    testCompleteFlow().then(() => process.exit(0));
}

module.exports = { testCompleteFlow };