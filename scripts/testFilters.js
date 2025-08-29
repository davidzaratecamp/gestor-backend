const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001/api';

async function testFilters() {
    try {
        console.log('🧪 Probando filtros de incidencias...\n');

        // Simular login como admin
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: 'david',
            password: 'admin123'
        });

        const token = loginResponse.data.token;
        const headers = { 'x-auth-token': token };

        console.log('✅ Login exitoso como admin\n');

        // Probar filtros
        console.log('📋 Probando diferentes filtros:\n');

        // 1. Sin filtros
        const allPending = await axios.get(`${API_BASE_URL}/incidents/pending`, { headers });
        console.log(`1️⃣ Sin filtros: ${allPending.data.length} incidencias pendientes`);

        // 2. Filtro por departamento Obama
        const obamaIncidents = await axios.get(`${API_BASE_URL}/incidents/pending?departamento=obama`, { headers });
        console.log(`2️⃣ Campaña Obama: ${obamaIncidents.data.length} incidencias`);

        // 3. Filtro por departamento Claro
        const claroIncidents = await axios.get(`${API_BASE_URL}/incidents/pending?departamento=claro`, { headers });
        console.log(`3️⃣ Campaña Claro: ${claroIncidents.data.length} incidencias`);

        // 4. Filtro por departamento Majority
        const majorityIncidents = await axios.get(`${API_BASE_URL}/incidents/pending?departamento=majority`, { headers });
        console.log(`4️⃣ Campaña Majority: ${majorityIncidents.data.length} incidencias`);

        // 5. Filtro por sede Barranquilla
        const barranquillaIncidents = await axios.get(`${API_BASE_URL}/incidents/pending?sede=barranquilla`, { headers });
        console.log(`5️⃣ Sede Barranquilla: ${barranquillaIncidents.data.length} incidencias`);

        // 6. Filtro combinado: Barranquilla + Obama
        const combinedFilter = await axios.get(`${API_BASE_URL}/incidents/pending?sede=barranquilla&departamento=obama`, { headers });
        console.log(`6️⃣ Barranquilla + Obama: ${combinedFilter.data.length} incidencias`);

        console.log('\n📊 Detalle de incidencias por filtro:');
        
        if (obamaIncidents.data.length > 0) {
            console.log('\n🔍 Incidencias Obama:');
            obamaIncidents.data.forEach(inc => {
                console.log(`   - ${inc.station_code} (${inc.sede}/${inc.departamento}): ${inc.failure_type}`);
            });
        }

        if (barranquillaIncidents.data.length > 0) {
            console.log('\n🔍 Incidencias Barranquilla:');
            barranquillaIncidents.data.forEach(inc => {
                console.log(`   - ${inc.station_code} (${inc.sede}/${inc.departamento}): ${inc.failure_type}`);
            });
        }

    } catch (error) {
        console.error('❌ Error probando filtros:', error.response?.data?.msg || error.message);
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    testFilters()
        .then(() => console.log('\n✅ Pruebas de filtros completadas'))
        .catch(error => {
            console.error('💥 Error crítico:', error.message);
            process.exit(1);
        });
}

module.exports = testFilters;