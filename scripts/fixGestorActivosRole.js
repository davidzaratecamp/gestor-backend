const db = require('../config/db');

async function fixGestorActivosRole() {
    try {
        console.log('🔍 Verificando estructura actual de la tabla users...');
        
        // Verificar la estructura actual de la columna role
        const [columns] = await db.query(`
            SHOW COLUMNS FROM users WHERE Field = 'role'
        `);
        
        if (columns.length > 0) {
            console.log('📋 Estructura actual de la columna role:', columns[0].Type);
            
            // Verificar si 'gestorActivos' ya está incluido
            if (columns[0].Type.includes('gestorActivos')) {
                console.log('✅ El rol gestorActivos ya está disponible en la base de datos');
                return;
            }
        }
        
        console.log('🔧 Aplicando migración para agregar rol gestorActivos...');
        
        // Aplicar la migración para actualizar el ENUM
        await db.query(`
            ALTER TABLE users 
            MODIFY COLUMN role ENUM(
                'admin',
                'supervisor', 
                'coordinador',
                'jefe_operaciones',
                'technician',
                'administrativo',
                'anonimo',
                'gestorActivos'
            ) NOT NULL DEFAULT 'technician'
        `);
        
        console.log('✅ Migración aplicada exitosamente');
        
        // Verificar que se aplicó correctamente
        const [newColumns] = await db.query(`
            SHOW COLUMNS FROM users WHERE Field = 'role'
        `);
        
        console.log('📋 Nueva estructura de la columna role:', newColumns[0].Type);
        
        // Verificar si la tabla activos existe, si no, crearla
        const [tables] = await db.query(`
            SHOW TABLES LIKE 'activos'
        `);
        
        if (tables.length === 0) {
            console.log('🔧 Creando tabla de activos...');
            
            await db.query(`
                CREATE TABLE activos (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    numero_placa VARCHAR(100) NOT NULL,
                    centro_costes INT NOT NULL CHECK (centro_costes BETWEEN 1 AND 10),
                    ubicacion ENUM('Claro', 'Obama', 'IT', 'Contratación', 'Reclutamiento', 'Selección', 'Finanzas') NOT NULL,
                    empresa VARCHAR(50) NOT NULL DEFAULT 'Asiste',
                    responsable VARCHAR(100) NOT NULL,
                    proveedor VARCHAR(200),
                    fecha_compra DATE,
                    numero_social VARCHAR(100),
                    poliza VARCHAR(100),
                    aseguradora VARCHAR(200),
                    garantia ENUM('Si', 'No') NOT NULL DEFAULT 'No',
                    fecha_vencimiento_garantia DATE NULL,
                    orden_compra VARCHAR(100),
                    clasificacion ENUM('Activo productivo', 'Activo no productivo') NOT NULL,
                    clasificacion_activo_fijo VARCHAR(200),
                    adjunto_archivo VARCHAR(500),
                    valor DECIMAL(12,2) DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    created_by_id INT,
                    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL
                )
            `);
            
            // Crear índices
            await db.query('CREATE INDEX idx_activos_numero_placa ON activos(numero_placa)');
            await db.query('CREATE INDEX idx_activos_ubicacion ON activos(ubicacion)');
            await db.query('CREATE INDEX idx_activos_responsable ON activos(responsable)');
            await db.query('CREATE INDEX idx_activos_created_at ON activos(created_at)');
            
            console.log('✅ Tabla de activos creada exitosamente');
        } else {
            console.log('✅ La tabla de activos ya existe');
        }
        
        console.log('🎉 Proceso completado exitosamente. Ahora puedes crear usuarios con rol gestorActivos');
        
    } catch (error) {
        console.error('❌ Error aplicando la migración:', error.message);
        throw error;
    }
}

// Ejecutar el script
if (require.main === module) {
    fixGestorActivosRole()
        .then(() => {
            console.log('Script ejecutado exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Error ejecutando el script:', error);
            process.exit(1);
        });
}

module.exports = fixGestorActivosRole;