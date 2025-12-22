const Activo = require('../models/Activo');

const scriptParserController = {
    // Recibir y parsear el texto completo del script
    async parseScriptText(req, res) {
        try {
            const { scriptText, mode = "preview", equipmentId } = req.body;

            if (!scriptText) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere el texto del script en el campo scriptText'
                });
            }

            console.log('Texto del script recibido:', scriptText.substring(0, 200) + '...');

            // Parsear el texto del script
            const parsedData = parseEquipmentScript(scriptText, equipmentId);

            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: parsedData.error,
                    script_recibido: scriptText.substring(0, 500) + '...'
                });
            }

            const equipmentData = parsedData.data;

            if (mode === "create") {
                // Crear el activo automáticamente
                const activoData = {
                    numero_placa: equipmentData.numero_placa,
                    centro_costes: 1,
                    ubicacion: 'Claro',
                    responsable: 'David Acero',
                    proveedor: '',
                    valor: 900000, // Por defecto ECC-CPU
                    fecha_compra: null,
                    numero_social: equipmentData.numero_serie_fabricante,
                    poliza: '',
                    aseguradora: '',
                    garantia: 'No',
                    fecha_vencimiento_garantia: null,
                    orden_compra: '',
                    clasificacion: 'Activo no productivo',
                    clasificacion_activo_fijo: '',
                    adjunto_archivo: null,
                    site: 'Site A',
                    puesto: equipmentData.puesto,
                    // Campos técnicos extraídos
                    marca_modelo: equipmentData.marca_modelo,
                    numero_serie_fabricante: equipmentData.numero_serie_fabricante,
                    cpu_procesador: equipmentData.cpu_procesador,
                    memoria_ram: equipmentData.memoria_ram,
                    almacenamiento: equipmentData.almacenamiento,
                    sistema_operativo: equipmentData.sistema_operativo,
                    estado: 'funcional'
                };

                const nuevoActivo = await Activo.create(activoData, 1); // Usuario sistema

                res.json({
                    success: true,
                    message: 'Activo creado automáticamente desde script',
                    activo: nuevoActivo,
                    datos_extraidos: equipmentData,
                    script_parseado: parsedData.debug
                });

            } else {
                // Solo preview
                res.json({
                    success: true,
                    message: 'Script parseado correctamente (modo preview)',
                    datos_extraidos: equipmentData,
                    activo_que_se_crearia: {
                        numero_placa: equipmentData.numero_placa,
                        puesto: equipmentData.puesto,
                        marca_modelo: equipmentData.marca_modelo,
                        numero_serie_fabricante: equipmentData.numero_serie_fabricante,
                        cpu_procesador: equipmentData.cpu_procesador,
                        memoria_ram: equipmentData.memoria_ram,
                        almacenamiento: equipmentData.almacenamiento,
                        sistema_operativo: equipmentData.sistema_operativo,
                        valor: 900000,
                        clasificacion: 'Activo no productivo'
                    },
                    script_parseado: parsedData.debug
                });
            }

        } catch (error) {
            console.error('Error al parsear script:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }
};

// Función para parsear el texto completo del script
function parseEquipmentScript(scriptText, customEquipmentId = null) {
    const result = {
        success: false,
        data: {},
        debug: {},
        error: null
    };

    try {
        // Limpiar el texto y convertir a líneas
        const lines = scriptText.split('\n').map(line => line.trim());
        
        // Extraer nombre del equipo
        let equipmentName = customEquipmentId;
        const equipmentMatch = scriptText.match(/RESUMEN DEL EQUIPO:\s*([^\n\r]+)/i);
        if (equipmentMatch && !equipmentName) {
            equipmentName = equipmentMatch[1].trim();
        }
        if (!equipmentName) {
            equipmentName = 'AUTO_' + Date.now();
        }

        // Extraer fabricante y modelo
        let manufacturer = '';
        let model = '';
        
        // Buscar líneas después de "--- EQUIPO ---"
        const equipmentSectionIndex = lines.findIndex(line => line.includes('--- EQUIPO ---'));
        if (equipmentSectionIndex >= 0) {
            // Buscar las líneas con fabricante y modelo
            for (let i = equipmentSectionIndex + 1; i < equipmentSectionIndex + 10; i++) {
                if (lines[i] && lines[i].includes('-')) continue; // Saltar separadores
                if (lines[i] && lines[i].toLowerCase().includes('manufacturer')) continue; // Saltar headers
                
                const line = lines[i];
                if (line && line.trim() && !line.includes('---') && !line.includes('Serial')) {
                    const parts = line.split(/\s+/);
                    if (parts.length >= 2) {
                        manufacturer = parts[0];
                        model = parts.slice(1).join(' ');
                        break;
                    }
                }
            }
        }

        // Extraer número de serie
        let serial = '';
        const serialMatch = scriptText.match(/Serial del equipo:\s*[-\s]*\n\s*([A-Z0-9]+)/i);
        if (serialMatch) {
            serial = serialMatch[1].trim();
        }

        // Extraer sistema operativo
        let osName = '';
        const osMatch = scriptText.match(/Nombre del sistema operativo:\s*([^\n\r]+)/i);
        if (osMatch) {
            osName = osMatch[1].trim();
        }

        // Extraer procesador
        let processorInfo = '';
        const processorMatch = scriptText.match(/Nombre:\s*([^\n\r]+)/i);
        if (processorMatch) {
            processorInfo = processorMatch[1].trim();
        }
        
        // Extraer velocidad del procesador
        const speedMatch = scriptText.match(/Velocidad:\s*([^\n\r]+)/i);
        if (speedMatch && processorInfo) {
            processorInfo += ` @ ${speedMatch[1].trim()}`;
        }

        // Extraer memoria total
        let memoryTotal = '';
        const memoryMatch = scriptText.match(/Capacidad total:\s*([^\n\r]+)/i);
        if (memoryMatch) {
            memoryTotal = memoryMatch[1].trim();
            
            // Buscar tipo de memoria (DDR3, DDR4, etc.)
            const memoryTypeMatch = scriptText.match(/BANK\s+\d+\s+(DDR\d+)/i);
            if (memoryTypeMatch) {
                memoryTotal += ` ${memoryTypeMatch[1]}`;
            }
        }

        // Extraer información de discos
        let storageInfo = '';
        const diskMatches = scriptText.match(/([A-Z0-9\-\s]+)\s+(SSD|HDD)\s+([\d,\.]+)/i);
        if (diskMatches) {
            const diskBrand = diskMatches[1].split(' ')[0]; // Primera palabra del nombre
            const diskType = diskMatches[2];
            const diskSize = diskMatches[3].replace(',', '.');
            storageInfo = `${diskBrand} ${diskType} ${diskSize}GB`;
        }

        // Extraer número del puesto desde el nombre del equipo
        let puestoNumber = '';
        if (equipmentName) {
            const numberMatch = equipmentName.match(/(\d+)/);
            if (numberMatch) {
                puestoNumber = numberMatch[1].padStart(3, '0'); // Pad con ceros para formato 001, 090, etc.
            }
        }

        // Construir datos estructurados
        const extractedData = {
            numero_placa: `ECC-CPU-${equipmentName}`,
            puesto: puestoNumber,
            marca_modelo: `${manufacturer} ${model}`.trim(),
            numero_serie_fabricante: serial,
            cpu_procesador: processorInfo,
            memoria_ram: memoryTotal,
            almacenamiento: storageInfo,
            sistema_operativo: osName
        };

        // Debug info
        result.debug = {
            equipment_name: equipmentName,
            manufacturer_found: manufacturer,
            model_found: model,
            serial_found: serial,
            os_found: osName,
            processor_found: processorInfo,
            memory_found: memoryTotal,
            storage_found: storageInfo,
            total_lines_processed: lines.length
        };

        // Validar que se encontraron datos mínimos
        if (!extractedData.marca_modelo || !extractedData.numero_serie_fabricante) {
            result.error = 'No se pudieron extraer datos básicos (fabricante/modelo o número de serie)';
            return result;
        }

        result.success = true;
        result.data = extractedData;
        return result;

    } catch (error) {
        result.error = `Error al parsear script: ${error.message}`;
        return result;
    }
}

module.exports = scriptParserController;