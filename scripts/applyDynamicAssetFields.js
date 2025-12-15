const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function applyDynamicAssetFields() {
    try {
        console.log('🔍 Aplicando migración 017: Campos dinámicos por tipo de activo...');
        
        // Verificar si ya se aplicó la migración
        try {
            const [columns] = await db.query(`
                SHOW COLUMNS FROM activos WHERE Field = 'tipo_activo'
            `);
            
            if (columns.length > 0) {
                console.log('✅ La migración ya fue aplicada previamente');
                return;
            }
        } catch (error) {
            console.log('ℹ️ La tabla activos necesita la migración de campos dinámicos');
        }
        
        console.log('🔧 Agregando nuevos campos a la tabla activos...');
        
        // 1. Agregar campos comunes para equipos de cómputo
        await db.query(`
            ALTER TABLE activos 
            ADD COLUMN marca_modelo VARCHAR(200) NULL COMMENT 'Marca y modelo del equipo. Ej: Dell OptiPlex 7080'
        `);
        console.log('✓ Campo marca_modelo agregado');
        
        await db.query(`
            ALTER TABLE activos 
            ADD COLUMN numero_serie_fabricante VARCHAR(200) NULL COMMENT 'Número de serie del fabricante'
        `);
        console.log('✓ Campo numero_serie_fabricante agregado');
        
        await db.query(`
            ALTER TABLE activos 
            ADD COLUMN cpu_procesador VARCHAR(300) NULL COMMENT 'Tipo, marca y velocidad del procesador. Ej: Intel Core i5-10400 2.9GHz'
        `);
        console.log('✓ Campo cpu_procesador agregado');
        
        await db.query(`
            ALTER TABLE activos 
            ADD COLUMN memoria_ram VARCHAR(200) NULL COMMENT 'Capacidad y tipo de memoria. Ej: 16GB DDR4'
        `);
        console.log('✓ Campo memoria_ram agregado');
        
        await db.query(`
            ALTER TABLE activos 
            ADD COLUMN almacenamiento VARCHAR(200) NULL COMMENT 'Tipo y capacidad de almacenamiento. Ej: SSD 512GB'
        `);
        console.log('✓ Campo almacenamiento agregado');
        
        await db.query(`
            ALTER TABLE activos 
            ADD COLUMN sistema_operativo VARCHAR(200) NULL COMMENT 'Sistema operativo instalado. Ej: Windows 11 Pro'
        `);
        console.log('✓ Campo sistema_operativo agregado');
        
        // 2. Agregar campos para monitores y TV
        await db.query(`
            ALTER TABLE activos 
            ADD COLUMN pulgadas VARCHAR(50) NULL COMMENT 'Tamaño en pulgadas del monitor/TV'
        `);
        console.log('✓ Campo pulgadas agregado');
        
        // 3. Agregar campo de estado
        await db.query(`
            ALTER TABLE activos 
            ADD COLUMN estado ENUM('funcional', 'en_reparacion', 'dado_de_baja', 'en_mantenimiento', 'disponible', 'asignado', 'fuera_de_servicio') NOT NULL DEFAULT 'funcional' COMMENT 'Estado actual del activo'
        `);
        console.log('✓ Campo estado agregado');
        
        // 4. Agregar campo tipo_activo
        await db.query(`
            ALTER TABLE activos 
            ADD COLUMN tipo_activo ENUM('ECC-CPU', 'ECC-SER', 'ECC-MON', 'ECC-IMP', 'ECC-POR', 'ECC-TV', 'OTHER') NULL COMMENT 'Tipo de activo según prefijo del número de placa'
        `);
        console.log('✓ Campo tipo_activo agregado');
        
        // 5. Agregar índices
        await db.query('ALTER TABLE activos ADD INDEX idx_activos_tipo_activo (tipo_activo)');
        await db.query('ALTER TABLE activos ADD INDEX idx_activos_estado (estado)');
        await db.query('ALTER TABLE activos ADD INDEX idx_activos_marca_modelo (marca_modelo)');
        await db.query('ALTER TABLE activos ADD INDEX idx_activos_numero_serie (numero_serie_fabricante)');
        console.log('✓ Índices agregados');
        
        // 6. Actualizar activos existentes con el nuevo patrón de detección
        await db.query(`
            UPDATE activos 
            SET tipo_activo = CASE 
                WHEN UPPER(numero_placa) REGEXP '^ECC-CPU-[0-9]+$' THEN 'ECC-CPU'
                WHEN UPPER(numero_placa) REGEXP '^ECC-SER-[0-9]+$' THEN 'ECC-SER'
                WHEN UPPER(numero_placa) REGEXP '^ECC-MON-[0-9]+$' THEN 'ECC-MON'
                WHEN UPPER(numero_placa) REGEXP '^ECC-IMP-[0-9]+$' THEN 'ECC-IMP'
                WHEN UPPER(numero_placa) REGEXP '^ECC-POR-[0-9]+$' THEN 'ECC-POR'
                WHEN UPPER(numero_placa) REGEXP '^ECC-TV-[0-9]+$' THEN 'ECC-TV'
                -- También detectar prefijos incompletos
                WHEN UPPER(numero_placa) LIKE 'ECC-CPU%' THEN 'ECC-CPU'
                WHEN UPPER(numero_placa) LIKE 'ECC-SER%' THEN 'ECC-SER'
                WHEN UPPER(numero_placa) LIKE 'ECC-MON%' THEN 'ECC-MON'
                WHEN UPPER(numero_placa) LIKE 'ECC-IMP%' THEN 'ECC-IMP'
                WHEN UPPER(numero_placa) LIKE 'ECC-POR%' THEN 'ECC-POR'
                WHEN UPPER(numero_placa) LIKE 'ECC-TV%' THEN 'ECC-TV'
                ELSE 'OTHER'
            END
        `);
        console.log('✓ Activos existentes actualizados con tipo_activo (patrón con guiones)');
        
        console.log('🎉 Migración 017 aplicada exitosamente');
        console.log('📋 Campos agregados:');
        console.log('   - marca_modelo (para todos los tipos)');
        console.log('   - numero_serie_fabricante (para todos los tipos)');
        console.log('   - cpu_procesador (ECC-CPU, ECC-SER, ECC-POR)');
        console.log('   - memoria_ram (ECC-CPU, ECC-SER, ECC-POR)');
        console.log('   - almacenamiento (ECC-CPU, ECC-SER, ECC-POR)');
        console.log('   - sistema_operativo (ECC-CPU, ECC-SER, ECC-POR)');
        console.log('   - pulgadas (ECC-MON, ECC-TV)');
        console.log('   - estado (para todos los tipos)');
        console.log('   - tipo_activo (automático según prefijo)');
        
    } catch (error) {
        console.error('❌ Error aplicando la migración:', error.message);
        throw error;
    }
}

// Ejecutar el script
if (require.main === module) {
    applyDynamicAssetFields()
        .then(() => {
            console.log('Script ejecutado exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Error ejecutando el script:', error);
            process.exit(1);
        });
}

module.exports = applyDynamicAssetFields;