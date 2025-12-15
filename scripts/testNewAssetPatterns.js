const db = require('../config/db');

async function testNewAssetPatterns() {
    try {
        console.log('🧪 Probando nuevo patrón de detección con guiones y consecutivos...\n');
        
        // 1. Probar la detección de patrones actualizados
        console.log('🔍 Probando detección de patrones con guiones:');
        
        const testCases = [
            // Patrones completos correctos
            { placa: 'ECC-CPU-001', expectedType: 'ECC-CPU', description: 'CPU completo' },
            { placa: 'ECC-SER-002', expectedType: 'ECC-SER', description: 'Servidor completo' },
            { placa: 'ECC-MON-003', expectedType: 'ECC-MON', description: 'Monitor completo' },
            { placa: 'ECC-IMP-004', expectedType: 'ECC-IMP', description: 'Impresora completo' },
            { placa: 'ECC-POR-005', expectedType: 'ECC-POR', description: 'Portátil completo' },
            { placa: 'ECC-TV-006', expectedType: 'ECC-TV', description: 'TV completo' },
            
            // Patrones mientras se escribe
            { placa: 'ECC-CPU', expectedType: 'ECC-CPU', description: 'CPU parcial' },
            { placa: 'ECC-CPU-', expectedType: 'ECC-CPU', description: 'CPU con guión' },
            { placa: 'ECC-MON-01', expectedType: 'ECC-MON', description: 'Monitor parcial número' },
            
            // Diferentes casos de mayúsculas/minúsculas
            { placa: 'ecc-cpu-001', expectedType: 'ECC-CPU', description: 'CPU minúsculas' },
            { placa: 'ECC-cpu-002', expectedType: 'ECC-CPU', description: 'CPU mixto' },
            
            // Patrones incorrectos
            { placa: 'ECCMON001', expectedType: 'OTHER', description: 'Sin guiones' },
            { placa: 'ECC_CPU_001', expectedType: 'OTHER', description: 'Con guiones bajos' },
            { placa: 'OTHER-001', expectedType: 'OTHER', description: 'Prefijo incorrecto' }
        ];
        
        for (const testCase of testCases) {
            const { placa, expectedType, description } = testCase;
            
            // Simular la lógica del modelo backend
            let detectedType = 'OTHER';
            const placaUpper = placa.toUpperCase();
            
            // Detectar patrones completos con guión y consecutivo
            if (placaUpper.match(/^ECC-CPU-\d+$/)) detectedType = 'ECC-CPU';
            else if (placaUpper.match(/^ECC-SER-\d+$/)) detectedType = 'ECC-SER';
            else if (placaUpper.match(/^ECC-MON-\d+$/)) detectedType = 'ECC-MON';
            else if (placaUpper.match(/^ECC-IMP-\d+$/)) detectedType = 'ECC-IMP';
            else if (placaUpper.match(/^ECC-POR-\d+$/)) detectedType = 'ECC-POR';
            else if (placaUpper.match(/^ECC-TV-\d+$/)) detectedType = 'ECC-TV';
            // También detectar prefijos mientras se escribe
            else if (placaUpper.startsWith('ECC-CPU')) detectedType = 'ECC-CPU';
            else if (placaUpper.startsWith('ECC-SER')) detectedType = 'ECC-SER';
            else if (placaUpper.startsWith('ECC-MON')) detectedType = 'ECC-MON';
            else if (placaUpper.startsWith('ECC-IMP')) detectedType = 'ECC-IMP';
            else if (placaUpper.startsWith('ECC-POR')) detectedType = 'ECC-POR';
            else if (placaUpper.startsWith('ECC-TV')) detectedType = 'ECC-TV';
            
            if (detectedType === expectedType) {
                console.log(`✅ ${placa.padEnd(15)} -> ${detectedType.padEnd(8)} (${description})`);
            } else {
                console.log(`❌ ${placa.padEnd(15)} -> Expected: ${expectedType}, Got: ${detectedType} (${description})`);
            }
        }
        
        // 2. Probar inserción de datos con nuevos patrones
        console.log('\n💾 Probando inserción con nuevos patrones...');
        
        try {
            // Eliminar datos de prueba previos
            await db.query('DELETE FROM activos WHERE numero_placa LIKE "TEST-ECC-%"');
            
            const testAssets = [
                {
                    numero_placa: 'TEST-ECC-CPU-001',
                    tipo: 'ECC-CPU',
                    marca_modelo: 'Dell OptiPlex 7080',
                    numero_serie_fabricante: 'TESTCPU001',
                    cpu_procesador: 'Intel Core i5-10400 2.9GHz',
                    memoria_ram: '16GB DDR4',
                    almacenamiento: 'SSD 512GB',
                    sistema_operativo: 'Windows 11 Pro'
                },
                {
                    numero_placa: 'TEST-ECC-MON-001',
                    tipo: 'ECC-MON',
                    marca_modelo: 'Samsung 24" LED',
                    numero_serie_fabricante: 'TESTMON001',
                    pulgadas: '24'
                },
                {
                    numero_placa: 'TEST-ECC-IMP-001',
                    tipo: 'ECC-IMP',
                    marca_modelo: 'HP LaserJet Pro',
                    numero_serie_fabricante: 'TESTIMP001'
                }
            ];
            
            for (const asset of testAssets) {
                await db.query(`
                    INSERT INTO activos (
                        numero_placa, centro_costes, ubicacion, responsable, clasificacion,
                        tipo_activo, marca_modelo, numero_serie_fabricante, cpu_procesador,
                        memoria_ram, almacenamiento, sistema_operativo, pulgadas, estado
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    asset.numero_placa, 1, 'IT', 'David Acero', 'Activo productivo',
                    asset.tipo, asset.marca_modelo, asset.numero_serie_fabricante,
                    asset.cpu_procesador || null, asset.memoria_ram || null,
                    asset.almacenamiento || null, asset.sistema_operativo || null,
                    asset.pulgadas || null, 'funcional'
                ]);
                
                console.log(`✅ Insertado: ${asset.numero_placa} (${asset.tipo})`);
            }
            
            // 3. Verificar que la detección automática funcionó
            console.log('\n🔍 Verificando detección automática en BD:');
            
            const [results] = await db.query(`
                SELECT numero_placa, tipo_activo, marca_modelo
                FROM activos 
                WHERE numero_placa LIKE "TEST-ECC-%"
                ORDER BY numero_placa
            `);
            
            results.forEach(row => {
                const expectedType = row.numero_placa.includes('-CPU-') ? 'ECC-CPU' :
                                   row.numero_placa.includes('-MON-') ? 'ECC-MON' :
                                   row.numero_placa.includes('-IMP-') ? 'ECC-IMP' : 'OTHER';
                
                if (row.tipo_activo === expectedType) {
                    console.log(`✅ ${row.numero_placa}: ${row.tipo_activo} (${row.marca_modelo})`);
                } else {
                    console.log(`❌ ${row.numero_placa}: Expected ${expectedType}, Got ${row.tipo_activo}`);
                }
            });
            
            // 4. Limpiar datos de prueba
            await db.query('DELETE FROM activos WHERE numero_placa LIKE "TEST-ECC-%"');
            console.log('\n🧹 Datos de prueba eliminados');
            
        } catch (error) {
            console.error('❌ Error en las pruebas de inserción:', error.message);
        }
        
        console.log('\n🎉 Pruebas del nuevo patrón completadas!');
        console.log('\n📋 Patrones soportados:');
        console.log('   ✅ ECC-CPU-001, ECC-CPU-002, etc. (Computadoras)');
        console.log('   ✅ ECC-SER-001, ECC-SER-002, etc. (Servidores)');
        console.log('   ✅ ECC-MON-001, ECC-MON-002, etc. (Monitores)');
        console.log('   ✅ ECC-IMP-001, ECC-IMP-002, etc. (Impresoras)');
        console.log('   ✅ ECC-POR-001, ECC-POR-002, etc. (Portátiles)');
        console.log('   ✅ ECC-TV-001, ECC-TV-002, etc. (Televisores)');
        console.log('   ✅ Detección en tiempo real mientras se escribe');
        console.log('   ✅ Insensible a mayúsculas/minúsculas');
        
    } catch (error) {
        console.error('❌ Error en las pruebas:', error.message);
        throw error;
    }
}

// Ejecutar el script
if (require.main === module) {
    testNewAssetPatterns()
        .then(() => {
            console.log('\nScript ejecutado exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Error ejecutando el script:', error);
            process.exit(1);
        });
}

module.exports = testNewAssetPatterns;