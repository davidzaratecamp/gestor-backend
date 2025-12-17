const Activo = require('../models/Activo');

const autoActivoController = {
    // Recibir información automática del equipo
    async receiveEquipmentData(req, res) {
        try {
            const equipmentData = req.body;
            console.log('Datos recibidos del equipo:', equipmentData);

            // Validar que vengan los datos mínimos requeridos
            if (!equipmentData.hostname || !equipmentData.manufacturer || !equipmentData.serial) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan datos mínimos: hostname, manufacturer o serial'
                });
            }

            // Parsear y estructurar los datos para el formato de activos
            const parsedData = parseEquipmentData(equipmentData);

            // Crear el activo automáticamente con los datos predeterminados
            const activoData = {
                numero_placa: `ECC-CPU-${equipmentData.hostname || 'AUTO'}`, // Se puede ajustar según necesidades
                centro_costes: 1,
                ubicacion: 'Claro', // Valor por defecto
                responsable: 'David Acero', // Valor por defecto
                proveedor: '',
                valor: 900000, // Valor por defecto para ECC-CPU
                fecha_compra: null,
                numero_social: equipmentData.serial,
                poliza: '',
                aseguradora: '',
                garantia: 'No',
                fecha_vencimiento_garantia: null,
                orden_compra: '',
                clasificacion: 'Activo no productivo', // Valor por defecto
                clasificacion_activo_fijo: '',
                adjunto_archivo: null,
                site: 'Site A', // Valor por defecto
                // Campos técnicos extraídos automáticamente
                marca_modelo: `${equipmentData.manufacturer} ${equipmentData.model}`.trim(),
                numero_serie_fabricante: equipmentData.serial,
                cpu_procesador: parsedData.cpu_procesador,
                memoria_ram: parsedData.memoria_ram,
                almacenamiento: parsedData.almacenamiento,
                sistema_operativo: parsedData.sistema_operativo,
                estado: 'funcional'
            };

            // Crear el activo en la base de datos
            const nuevoActivo = await Activo.create(activoData, 1); // Usuario ID 1 como sistema

            res.json({
                success: true,
                message: 'Activo creado automáticamente',
                activo: nuevoActivo,
                datos_procesados: parsedData
            });

        } catch (error) {
            console.error('Error al procesar datos del equipo:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    },

    // Solo recibir y mostrar los datos para preview (sin crear activo)
    async previewEquipmentData(req, res) {
        try {
            const equipmentData = req.body;
            console.log('Preview de datos del equipo:', equipmentData);

            if (!equipmentData.hostname || !equipmentData.manufacturer || !equipmentData.serial) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan datos mínimos: hostname, manufacturer o serial'
                });
            }

            const parsedData = parseEquipmentData(equipmentData);

            res.json({
                success: true,
                message: 'Datos procesados correctamente (solo preview)',
                datos_originales: equipmentData,
                datos_procesados: parsedData,
                activo_que_se_crearia: {
                    numero_placa: `ECC-CPU-${equipmentData.hostname}`,
                    marca_modelo: `${equipmentData.manufacturer} ${equipmentData.model}`.trim(),
                    numero_serie_fabricante: equipmentData.serial,
                    cpu_procesador: parsedData.cpu_procesador,
                    memoria_ram: parsedData.memoria_ram,
                    almacenamiento: parsedData.almacenamiento,
                    sistema_operativo: parsedData.sistema_operativo
                }
            });

        } catch (error) {
            console.error('Error al procesar preview:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }
};

// Función para parsear y limpiar los datos del equipo
function parseEquipmentData(data) {
    const result = {
        cpu_procesador: '',
        memoria_ram: '',
        almacenamiento: '',
        sistema_operativo: ''
    };

    // Procesar CPU
    if (data.processor_name) {
        result.cpu_procesador = data.processor_name;
        if (data.processor_speed) {
            result.cpu_procesador += ` @ ${data.processor_speed}`;
        }
    }

    // Procesar memoria RAM
    if (data.memory_total) {
        // Convertir de GB a formato legible
        const memoryGB = data.memory_total;
        result.memoria_ram = `${memoryGB} GB`;
        
        // Añadir tipo si está disponible
        if (data.memory_modules && data.memory_modules.length > 0) {
            const memoryType = data.memory_modules[0].type; // Tomar el tipo del primer módulo
            if (memoryType) {
                result.memoria_ram += ` ${memoryType}`;
            }
        }
    }

    // Procesar almacenamiento
    if (data.disks && data.disks.length > 0) {
        const primaryDisk = data.disks[0]; // Tomar el disco principal
        if (primaryDisk.media_type && primaryDisk.size) {
            result.almacenamiento = `${primaryDisk.media_type} ${primaryDisk.size}GB`;
            if (primaryDisk.friendly_name) {
                // Extraer marca del nombre amigable
                const brand = primaryDisk.friendly_name.split(' ')[0];
                result.almacenamiento = `${brand} ${primaryDisk.media_type} ${primaryDisk.size}GB`;
            }
        }
    }

    // Procesar sistema operativo
    if (data.os_name) {
        result.sistema_operativo = data.os_name;
        if (data.system_type) {
            result.sistema_operativo += ` (${data.system_type})`;
        }
    }

    return result;
}

module.exports = autoActivoController;