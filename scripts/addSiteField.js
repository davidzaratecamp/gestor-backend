const db = require('../config/db');

async function addSiteField() {
    try {
        console.log('🔍 Aplicando migración 018: Agregar campo Site...');
        
        // Verificar si ya existe la columna site
        try {
            const [columns] = await db.query(`
                SHOW COLUMNS FROM activos WHERE Field = 'site'
            `);
            
            if (columns.length > 0) {
                console.log('✅ El campo site ya existe en la tabla activos');
                return;
            }
        } catch (error) {
            console.log('ℹ️ La tabla activos necesita el campo site');
        }
        
        console.log('🔧 Agregando campo site a la tabla activos...');
        
        // 1. Agregar columna site
        await db.query(`
            ALTER TABLE activos 
            ADD COLUMN site ENUM('Site A', 'Site B') NULL COMMENT 'Ubicación del site del activo'
        `);
        console.log('✓ Campo site agregado');
        
        // 2. Agregar índice
        await db.query(`
            ALTER TABLE activos 
            ADD INDEX idx_activos_site (site)
        `);
        console.log('✓ Índice para site agregado');
        
        // 3. Verificar la estructura
        const [newColumns] = await db.query(`
            SHOW COLUMNS FROM activos WHERE Field = 'site'
        `);
        console.log('📋 Nueva estructura del campo site:', newColumns[0].Type);
        
        console.log('🎉 Migración 018 aplicada exitosamente');
        console.log('📋 Campo agregado:');
        console.log('   - site: ENUM("Site A", "Site B") - Ubicación del site del activo');
        console.log('');
        console.log('ℹ️  NOTA: Los activos existentes tendrán site = NULL');
        console.log('    Se recomienda actualizar manualmente estos registros');
        
    } catch (error) {
        console.error('❌ Error aplicando la migración:', error.message);
        throw error;
    }
}

// Ejecutar el script
if (require.main === module) {
    addSiteField()
        .then(() => {
            console.log('Script ejecutado exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Error ejecutando el script:', error);
            process.exit(1);
        });
}

module.exports = addSiteField;