const Incident = require('../models/Incident');
const User = require('../models/User');
const Workstation = require('../models/Workstation');

// @desc    Obtener todas las incidencias
// @route   GET /api/incidents
// @access  Private
exports.getAllIncidents = async (req, res) => {
    try {
        const { status, assigned_to, departamento, sede } = req.query;
        const userRole = req.user.role;
        const userSede = req.user.sede;
        const userDepartamento = req.user.departamento;
        
        // Usar getAll con datos del usuario para garantizar visibilidad correcta
        const incidents = await Incident.getAll(
            status, 
            assigned_to, 
            userRole, 
            userSede, 
            userDepartamento, 
            req.user.id,
            { departamento, sede }
        );
        
        res.json(incidents);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener incidencias asignadas al técnico autenticado
// @route   GET /api/incidents/my-incidents
// @access  Private (Technician)
exports.getMyIncidents = async (req, res) => {
    try {
        const userRole = req.user.role;
        const userSede = req.user.sede;
        const userDepartamento = req.user.departamento;
        
        const incidents = await Incident.getVisibleForUser(userRole, userSede, null, req.user.id, {}, userDepartamento, req.user.id);
        res.json(incidents);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener incidencias pendientes (para técnicos)
// @route   GET /api/incidents/pending
// @access  Private (Technician/Admin)
exports.getPendingIncidents = async (req, res) => {
    try {
        const userRole = req.user.role;
        const userSede = req.user.sede;
        const userDepartamento = req.user.departamento;
        const { departamento, sede } = req.query;
        
        const incidents = await Incident.getVisibleForUser(
            userRole, 
            userSede, 
            'pendiente', 
            null, 
            { departamento, sede },
            userDepartamento,
            req.user.id
        );
        res.json(incidents);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener incidencias en supervisión
// @route   GET /api/incidents/supervision
// @access  Private (Supervisor/Admin)
exports.getIncidentsInSupervision = async (req, res) => {
    try {
        const userRole = req.user.role;
        const userSede = req.user.sede;
        const userDepartamento = req.user.departamento;
        const { departamento, sede, creador, tiempo_supervision } = req.query; // Capturar filtros de la query

        // Construir objeto de filtros para el modelo
        const filters = {};
        if (departamento) filters.departamento = departamento;
        if (sede) filters.sede = sede;
        if (creador) filters.creador = creador;
        if (tiempo_supervision) filters.tiempo_supervision = tiempo_supervision;
        
        
        const incidents = await Incident.getVisibleForUser(
            userRole, 
            userSede, 
            'en_supervision', 
            null, 
            filters, // Pasar los filtros al modelo
            userDepartamento, 
            req.user.id
        );
        
        res.json(incidents);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener historial de incidencias aprobadas
// @route   GET /api/incidents/approved
// @access  Private
exports.getApprovedIncidents = async (req, res) => {
    try {
        const userRole = req.user.role;
        const userSede = req.user.sede;
        const userDepartamento = req.user.departamento;
        
        const incidents = await Incident.getApprovedIncidentsForUser(userRole, userSede, userDepartamento, req.user.id);
        
        res.json(incidents);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener una incidencia por ID
// @route   GET /api/incidents/:id
// @access  Private
exports.getIncidentById = async (req, res) => {
    try {
        const incident = await Incident.getById(req.params.id);
        
        if (!incident) {
            return res.status(404).json({ msg: 'Incidencia no encontrada' });
        }
        
        res.json(incident);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener historial de una incidencia
// @route   GET /api/incidents/:id/history
// @access  Private
exports.getIncidentHistory = async (req, res) => {
    try {
        const history = await Incident.getHistory(req.params.id);
        res.json(history);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Crear nueva incidencia
// @route   POST /api/incidents
// @access  Private (Supervisor/Admin)
exports.createIncident = async (req, res) => {
    const { sede, departamento, puesto_numero, failure_type, description, anydesk_address, advisor_cedula } = req.body;

    // Validaciones básicas
    if (!departamento || !puesto_numero || !failure_type || !description) {
        return res.status(400).json({ 
            msg: 'Todos los campos son requeridos: departamento, número de puesto, tipo de falla y descripción' 
        });
    }

    // Validar sede
    const validSedes = ['bogota', 'barranquilla', 'villavicencio'];
    let incidentSede;
    
    // Para jefes de operaciones, siempre usar su sede (no pueden cambiarla)
    if (req.user.role === 'jefe_operaciones') {
        incidentSede = req.user.sede;
        if (sede && sede !== req.user.sede) {
            return res.status(400).json({ 
                msg: `Los jefes de operaciones solo pueden crear incidencias en su sede: ${req.user.sede}` 
            });
        }
    } else {
        incidentSede = sede || req.user.sede || 'bogota';
    }
    
    if (!validSedes.includes(incidentSede)) {
        return res.status(400).json({ 
            msg: 'Sede no válida. Debe ser: bogota, barranquilla o villavicencio' 
        });
    }

    // Validaciones especiales para Barranquilla
    if (incidentSede === 'barranquilla') {
        if (!anydesk_address) {
            return res.status(400).json({ 
                msg: 'La dirección AnyDesk es requerida para incidencias en Barranquilla' 
            });
        }
        if (!advisor_cedula) {
            return res.status(400).json({ 
                msg: 'La cédula del asesor es requerida para incidencias en Barranquilla' 
            });
        }
    }

    // Validar departamentos según la sede y rol
    const userRole = req.user.role;
    const isAdministrativo = userRole === 'administrativo';
    const isJefeOperaciones = userRole === 'jefe_operaciones';
    let validDepartamentos;
    
    if (isAdministrativo) {
        validDepartamentos = ['contratacion', 'seleccion', 'reclutamiento', 'area_financiera'];
    } else if (isJefeOperaciones) {
        // Jefes de operaciones solo pueden crear incidencias en su propio departamento
        validDepartamentos = [req.user.departamento];
        // Si no especifica departamento, usar el del jefe de operaciones
        if (!departamento || departamento !== req.user.departamento) {
            return res.status(400).json({ 
                msg: `Los jefes de operaciones solo pueden crear incidencias en su departamento: ${req.user.departamento}` 
            });
        }
    } else {
        validDepartamentos = incidentSede === 'bogota' 
            ? ['obama', 'majority', 'claro'] 
            : ['obama', 'claro']; // Villavicencio y Barranquilla no tienen majority
    }
        
    if (!validDepartamentos.includes(departamento)) {
        const roleDescription = isAdministrativo ? 'administrativo' : isJefeOperaciones ? 'jefe de operaciones' : incidentSede;
        return res.status(400).json({ 
            msg: `Departamento no válido para ${roleDescription}. Debe ser: ${validDepartamentos.join(', ')}` 
        });
    }

    const validFailureTypes = ['pantalla', 'perifericos', 'internet', 'software', 'otro'];
    if (!validFailureTypes.includes(failure_type)) {
        return res.status(400).json({ 
            msg: 'Tipo de falla no válido. Debe ser: pantalla, perifericos, internet, software u otro' 
        });
    }

    const puestoNum = parseInt(puesto_numero);
    if (!puestoNum || puestoNum < 1 || puestoNum > 300) {
        return res.status(400).json({ 
            msg: 'Número de puesto no válido. Debe estar entre 1 y 300' 
        });
    }

    try {
        // Generar código de estación automáticamente
        const stationCode = generateStationCode(incidentSede, departamento, puestoNum);
        
        // Usar el departamento real sin mapeos artificiales
        const workstationDepartment = departamento;
        
        // Crear o encontrar la estación de trabajo
        let workstation;
        
        if (incidentSede === 'barranquilla') {
            // Para Barranquilla, siempre crear una nueva workstation única para preservar datos históricos
            // Generar código único con sufijo aleatorio corto
            const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
            const uniqueStationCode = `${stationCode}-${randomSuffix}`;
            
            workstation = await Workstation.create({
                station_code: uniqueStationCode,
                location_details: `Puesto ${stationCode} - ${departamento.toUpperCase()} (Remoto)`,
                sede: incidentSede,
                departamento: workstationDepartment,
                anydesk_address,
                advisor_cedula
            });
        } else {
            // Para otras sedes, usar el método existente
            workstation = await Workstation.findOrCreateByCode(stationCode, departamento, incidentSede);
        }
        
        const newIncident = await Incident.create({
            workstation_id: workstation.id,
            reported_by_id: req.user.id,
            failure_type,
            description
        });

        res.status(201).json({
            msg: 'Incidencia creada exitosamente',
            incident: newIncident
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Crear nueva incidencia con archivos adjuntos
// @route   POST /api/incidents/with-files
// @access  Private (Coordinadores)
exports.createIncidentWithFiles = async (req, res) => {
    const { sede, departamento, puesto_numero, failure_type, description, anydesk_address, advisor_cedula } = req.body;

    // Validaciones básicas
    if (!departamento || !failure_type || !description) {
        return res.status(400).json({ 
            msg: 'Todos los campos son requeridos: departamento, tipo de falla y descripción' 
        });
    }

    // Validar sede
    const validSedes = ['bogota', 'barranquilla', 'villavicencio'];
    const incidentSede = sede || req.user.sede || 'bogota';
    
    
    if (!validSedes.includes(incidentSede)) {
        return res.status(400).json({ 
            msg: 'Sede no válida. Debe ser: bogota, barranquilla o villavicencio' 
        });
    }

    // Para Barranquilla, puesto_numero puede ser opcional (será 1 por defecto)
    // Para administrativos, generar número único basado en departamento
    const isAdministrativo = req.user.role === 'administrativo';
    const puestoNum = incidentSede === 'barranquilla' ? 1 : 
                     isAdministrativo ? 1 : // Usar 1 para administrativos, no 0
                     parseInt(puesto_numero);

    if (incidentSede !== 'barranquilla' && !isAdministrativo && (!puesto_numero || isNaN(puestoNum) || puestoNum < 1 || puestoNum > 300)) {
        return res.status(400).json({ 
            msg: 'Número de puesto debe ser un número entre 1 y 300' 
        });
    }

    // Validaciones especiales para Barranquilla
    if (incidentSede === 'barranquilla') {
        if (!anydesk_address) {
            return res.status(400).json({ 
                msg: 'La dirección AnyDesk es requerida para incidencias en Barranquilla' 
            });
        }
        if (!advisor_cedula) {
            return res.status(400).json({ 
                msg: 'La cédula del asesor es requerida para incidencias en Barranquilla' 
            });
        }
    }

    // Validar departamentos según la sede y rol
    // isAdministrativo ya declarado arriba
    let validDepartamentos;
    
    if (isAdministrativo) {
        validDepartamentos = ['contratacion', 'seleccion', 'reclutamiento', 'area_financiera'];
    } else {
        validDepartamentos = incidentSede === 'bogota' 
            ? ['obama', 'majority', 'claro'] 
            : ['obama', 'claro']; // Villavicencio y Barranquilla no tienen majority
    }
        
    if (!validDepartamentos.includes(departamento)) {
        return res.status(400).json({ 
            msg: `Departamento no válido para ${isAdministrativo ? 'administrativo' : incidentSede}. Debe ser: ${validDepartamentos.join(', ')}` 
        });
    }

    const validFailureTypes = ['pantalla', 'perifericos', 'internet', 'software', 'otro'];
    if (!validFailureTypes.includes(failure_type)) {
        return res.status(400).json({ 
            msg: 'Tipo de falla no válido. Debe ser: pantalla, perifericos, internet, software u otro' 
        });
    }

    function generateStationCode(sede, departamento, puestoNumero) {
        const sedePrefixes = {
            'bogota': 'BOG-',
            'barranquilla': 'BAQ-',
            'villavicencio': 'VVC-'
        };
        
        const deptPrefixes = {
            'obama': 'O',
            'majority': 'M', 
            'claro': 'C',
            'contratacion': 'CT',
            'seleccion': 'SL',
            'reclutamiento': 'RC',
            'area_financiera': 'AF'
        };
        
        const sedePrefix = sedePrefixes[sede] || 'BOG-';
        const deptPrefix = deptPrefixes[departamento];
        const paddedNumber = String(puestoNumero).padStart(3, '0');
        
        return `${sedePrefix}${deptPrefix}${paddedNumber}`;
    }

    try {
        // Generar código de estación automáticamente
        const stationCode = generateStationCode(incidentSede, departamento, puestoNum);
        
        // Usar el departamento real sin mapeos artificiales
        const workstationDepartment = departamento;
        
        // Crear o encontrar la estación de trabajo
        let workstation;
        
        if (incidentSede === 'barranquilla') {
            // Para Barranquilla, siempre crear una nueva workstation única para preservar datos históricos
            // Generar código único con sufijo aleatorio corto
            const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
            const uniqueStationCode = `${stationCode}-${randomSuffix}`;
            
            workstation = await Workstation.create({
                station_code: uniqueStationCode,
                location_details: `Puesto ${stationCode} - ${departamento.toUpperCase()} (Remoto)`,
                sede: incidentSede,
                departamento: workstationDepartment,
                anydesk_address,
                advisor_cedula
            });
        } else if (isAdministrativo) {
            // Para administrativos, crear workstation especial
            const existingStation = await Workstation.getByStationCode(stationCode);
            
            if (existingStation) {
                workstation = existingStation;
            } else {
                // Crear workstation para área administrativa
                const departamentoLabel = {
                    'contratacion': 'Contratación',
                    'seleccion': 'Selección', 
                    'reclutamiento': 'Reclutamiento',
                    'area_financiera': 'Área Financiera'
                }[departamento] || departamento;
                
                workstation = await Workstation.create({
                    station_code: stationCode,
                    location_details: `Área ${departamentoLabel} - ${incidentSede.toUpperCase()}`,
                    sede: incidentSede,
                    departamento: workstationDepartment
                });
            }
        } else {
            // Para otras sedes, usar el método existente
            workstation = await Workstation.findOrCreateByCode(stationCode, departamento, incidentSede);
        }
        
        const newIncident = await Incident.create({
            workstation_id: workstation.id,
            reported_by_id: req.user.id,
            failure_type,
            description
        });


        // Guardar archivos adjuntos si existen
        const attachments = [];
        if (req.files && req.files.length > 0) {
            const db = require('../config/db');
            
            for (const file of req.files) {
                const attachmentQuery = `
                    INSERT INTO incident_attachments 
                    (incident_id, filename, original_name, file_type, file_size, file_path, uploaded_by) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
                
                const [result] = await db.execute(attachmentQuery, [
                    newIncident.id,
                    file.filename,
                    file.originalname,
                    file.mimetype,
                    file.size,
                    file.path,
                    req.user.id
                ]);
                
                attachments.push({
                    id: result.insertId,
                    filename: file.filename,
                    original_name: file.originalname,
                    file_type: file.mimetype,
                    file_size: file.size
                });
            }
        }

        res.status(201).json({
            msg: 'Incidencia creada exitosamente',
            incident: newIncident,
            attachments: attachments
        });
    } catch (err) {
        console.error('Error en createIncidentWithFiles:', err.message);
        console.error('Stack trace:', err.stack);
        res.status(500).send('Error del servidor');
    }
};

// Función para generar código de estación
const generateStationCode = (sede, departamento, puestoNumero) => {
    const sedePrefixes = {
        'bogota': 'BOG-',
        'barranquilla': 'BAQ-',
        'villavicencio': 'VVC-'
    };
    
    const deptPrefixes = {
        'obama': 'O',
        'majority': 'M', 
        'claro': 'C',
        'contratacion': 'CT',
        'seleccion': 'SL',
        'reclutamiento': 'RC',
        'area_financiera': 'AF'
    };
    
    const sedePrefix = sedePrefixes[sede] || 'BOG-';
    const deptPrefix = deptPrefixes[departamento];
    const paddedNumber = String(puestoNumero).padStart(3, '0');
    
    return `${sedePrefix}${deptPrefix}${paddedNumber}`;
};

// @desc    Asignar técnico a una incidencia
// @route   PUT /api/incidents/:id/assign
// @access  Private (Admin o Technician para auto-asignarse)
exports.assignTechnician = async (req, res) => {
    const { technician_id } = req.body;

    if (!technician_id) {
        return res.status(400).json({ msg: 'ID del técnico es requerido' });
    }

    try {
        // Si es un técnico, solo puede asignarse a sí mismo
        if (req.user.role === 'technician' && parseInt(technician_id) !== req.user.id) {
            return res.status(403).json({ msg: 'Los técnicos solo pueden asignarse incidencias a sí mismos' });
        }

        // Verificar que el técnico existe y tiene el rol correcto
        const technician = await User.getById(technician_id);
        if (!technician) {
            return res.status(404).json({ msg: 'Técnico no encontrado' });
        }

        if (technician.role !== 'technician') {
            return res.status(400).json({ msg: 'El usuario seleccionado no es un técnico' });
        }

        await Incident.assignTechnician(req.params.id, technician_id, req.user.id);
        
        res.json({ 
            msg: `Incidencia asignada exitosamente a ${technician.full_name}` 
        });
    } catch (err) {
        console.error(err.message);
        if (err.message.includes('No se pudo asignar técnico')) {
            return res.status(400).json({ msg: err.message });
        }
        res.status(500).send('Error del servidor');
    }
};

// @desc    Reasignar técnico a una incidencia en proceso
// @route   PUT /api/incidents/:id/reassign
// @access  Private (Solo Admin)
exports.reassignTechnician = async (req, res) => {
    const { technician_id, reason } = req.body;

    if (!technician_id) {
        return res.status(400).json({ msg: 'ID del nuevo técnico es requerido' });
    }

    try {
        // Solo admins pueden reasignar técnicos
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Solo los administradores pueden reasignar técnicos' });
        }

        // Verificar que el técnico existe y tiene el rol correcto
        const technician = await User.getById(technician_id);
        if (!technician) {
            return res.status(404).json({ msg: 'Técnico no encontrado' });
        }

        if (technician.role !== 'technician') {
            return res.status(400).json({ msg: 'El usuario seleccionado no es un técnico' });
        }

        await Incident.reassignTechnician(req.params.id, technician_id, req.user.id, reason);
        
        res.json({ 
            msg: `Incidencia reasignada exitosamente a ${technician.full_name}` 
        });
    } catch (err) {
        console.error(err.message);
        if (err.message.includes('No se pudo reasignar')) {
            return res.status(400).json({ msg: err.message });
        }
        res.status(500).send('Error del servidor');
    }
};

// @desc    Marcar incidencia como resuelta (técnico)
// @route   PUT /api/incidents/:id/resolve
// @access  Private (Technician)
exports.markAsResolved = async (req, res) => {
    const { resolution_notes } = req.body;

    try {
        await Incident.markAsResolved(req.params.id, req.user.id, resolution_notes || '');
        
        res.json({ 
            msg: 'Incidencia marcada como resuelta y enviada a supervisión' 
        });
    } catch (err) {
        console.error(err.message);
        if (err.message.includes('No se pudo marcar como resuelto')) {
            return res.status(400).json({ msg: err.message });
        }
        res.status(500).send('Error del servidor');
    }
};

// @desc    Aprobar incidencia (supervisor)
// @route   PUT /api/incidents/:id/approve
// @access  Private (Supervisor/Admin)
exports.approveIncident = async (req, res) => {
    const { approval_notes, technician_rating, rating_feedback } = req.body;

    try {
        // Aprobar la incidencia
        await Incident.approve(req.params.id, req.user.id, approval_notes || '');
        
        // Si se proporcionó una calificación, guardarla
        if (technician_rating && technician_rating >= 1 && technician_rating <= 5) {
            const db = require('../config/db');
            
            // Obtener información de la incidencia para obtener el técnico
            const incident = await Incident.getById(req.params.id);
            
            if (incident && incident.assigned_to_id) {
                // Insertar o actualizar la calificación
                await db.execute(`
                    INSERT INTO technician_ratings 
                    (incident_id, technician_id, rated_by_id, rating, feedback) 
                    VALUES (?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    rating = VALUES(rating),
                    feedback = VALUES(feedback),
                    updated_at = CURRENT_TIMESTAMP
                `, [
                    req.params.id,
                    incident.assigned_to_id,
                    req.user.id,
                    technician_rating,
                    rating_feedback || null
                ]);
            }
        }
        
        res.json({ 
            msg: 'Incidencia aprobada exitosamente' +
                (technician_rating ? ' y técnico calificado' : '')
        });
    } catch (err) {
        console.error(err.message);
        if (err.message.includes('No se pudo aprobar')) {
            return res.status(400).json({ msg: err.message });
        }
        res.status(500).send('Error del servidor');
    }
};

// @desc    Rechazar incidencia (supervisor)
// @route   PUT /api/incidents/:id/reject
// @access  Private (Supervisor/Admin)
exports.rejectIncident = async (req, res) => {
    const { rejection_reason } = req.body;

    if (!rejection_reason) {
        return res.status(400).json({ msg: 'El motivo del rechazo es requerido' });
    }

    try {
        await Incident.reject(req.params.id, req.user.id, rejection_reason);

        res.json({
            msg: 'Incidencia rechazada y devuelta al técnico'
        });
    } catch (err) {
        console.error(err.message);
        if (err.message.includes('No se pudo rechazar')) {
            return res.status(400).json({ msg: err.message });
        }
        res.status(500).send('Error del servidor');
    }
};

// @desc    Devolver incidencia al creador (técnico)
// @route   PUT /api/incidents/:id/return
// @access  Private (Technician)
exports.returnIncident = async (req, res) => {
    const { return_reason } = req.body;

    if (!return_reason) {
        return res.status(400).json({ msg: 'El motivo de la devolución es requerido' });
    }

    try {
        await Incident.returnToCreator(req.params.id, req.user.id, return_reason);

        res.json({
            msg: 'Incidencia devuelta al creador para correcciones'
        });
    } catch (err) {
        console.error(err.message);
        if (err.message.includes('No se pudo devolver')) {
            return res.status(400).json({ msg: err.message });
        }
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener incidencias devueltas para el usuario actual
// @route   GET /api/incidents/returned
// @access  Private (Coordinador/Supervisor/Admin)
exports.getReturnedIncidents = async (req, res) => {
    try {
        const userRole = req.user.role;
        const userSede = req.user.sede;
        const userDepartamento = req.user.departamento;
        
        const incidents = await Incident.getReturnedIncidents(userRole, userSede, userDepartamento, req.user.id);
        res.json(incidents);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener archivos adjuntos de una incidencia
// @route   GET /api/incidents/:id/attachments
// @access  Private
exports.getIncidentAttachments = async (req, res) => {
    const { id } = req.params;
    
    try {
        const db = require('../config/db');
        
        // Verificar que la incidencia existe
        const incident = await Incident.getById(id);
        if (!incident) {
            return res.status(404).json({ msg: 'Incidencia no encontrada' });
        }
        
        // Obtener archivos adjuntos
        const [rows] = await db.execute(`
            SELECT id, filename, original_name, file_type, file_size, uploaded_at, uploaded_by,
                   CONCAT('/api/files/incidents/', filename) as file_url
            FROM incident_attachments 
            WHERE incident_id = ? 
            ORDER BY uploaded_at DESC
        `, [id]);
        
        res.json(rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener estadísticas de incidencias por sede
// @route   GET /api/incidents/stats/by-sede
// @access  Private (Admin)
exports.getStatsBySede = async (req, res) => {
    try {
        const db = require('../config/db');
        const userRole = req.user.role;
        const userSede = req.user.sede;
        const userDepartamento = req.user.departamento;
        const userId = req.user.id;
        
        let query = `
            SELECT 
                w.sede,
                COUNT(CASE WHEN i.status = 'pendiente' THEN 1 END) as pendientes,
                COUNT(CASE WHEN i.status = 'en_proceso' THEN 1 END) as en_proceso,
                COUNT(CASE WHEN i.status = 'en_supervision' THEN 1 END) as en_supervision,
                COUNT(CASE WHEN i.status = 'aprobado' THEN 1 END) as aprobadas,
                COUNT(*) as total
            FROM incidents i
            JOIN workstations w ON i.workstation_id = w.id
            JOIN users reporter ON i.reported_by_id = reporter.id
            WHERE 1=1
        `;
        
        const params = [];
        
        // Aplicar los mismos filtros de visibilidad que getVisibleForUser
        // Admin ve todas las sedes sin filtros
        if (userRole === 'admin') {
            // No aplicar filtros - el admin ve todo
        } else if (userRole === 'technician') {
            if (userSede === 'bogota') {
                query += ' AND w.sede IN ("bogota", "barranquilla")';
            } else if (userSede === 'villavicencio') {
                query += ' AND w.sede IN ("villavicencio", "barranquilla")';
            } else {
                query += ' AND w.sede = ?';
                params.push(userSede);
            }
        } else if (userRole === 'supervisor') {
            if (userSede === 'bogota') {
                query += ' AND w.sede IN ("bogota", "barranquilla")';
            } else if (userSede === 'villavicencio') {
                query += ' AND w.sede IN ("villavicencio", "barranquilla")';
            } else {
                query += ' AND w.sede = ?';
                params.push(userSede);
            }
        } else if (userRole === 'coordinador') {
            if (userSede === 'bogota') {
                query += ' AND w.sede IN ("bogota", "barranquilla")';
            } else if (userSede === 'villavicencio') {
                query += ' AND w.sede IN ("villavicencio", "barranquilla")';
            } else {
                query += ' AND w.sede = ?';
                params.push(userSede);
            }
        } else if (userRole === 'jefe_operaciones') {
            query += ' AND w.sede = ? AND w.departamento = ?';
            params.push(userSede);
            params.push(userDepartamento);
        }
        
        // Roles administrativos solo ven sus propias incidencias
        if (userRole === 'administrativo') {
            query += ' AND i.reported_by_id = ?';
            params.push(userId);
        }
        // Solo admin ve todo
        
        query += ' GROUP BY w.sede ORDER BY w.sede';
        
        const [rows] = await db.execute(query, params);
        
        // Asegurar que todas las sedes están incluidas, incluso con 0 incidencias
        const sedesBase = ['bogota', 'barranquilla', 'villavicencio'];
        const resultado = sedesBase.map(sede => {
            const sedeData = rows.find(row => row.sede === sede) || {
                sede,
                pendientes: 0,
                en_proceso: 0,
                en_supervision: 0,
                aprobadas: 0,
                total: 0
            };
            return sedeData;
        });
        
        res.json(resultado);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener estado de técnicos (libres vs asignados)
// @route   GET /api/incidents/stats/technicians
// @access  Private (Admin)
exports.getTechniciansStatus = async (req, res) => {
    try {
        const db = require('../config/db');
        
        const [rows] = await db.execute(`
            SELECT 
                u.id,
                u.full_name,
                u.sede,
                u.departamento,
                COUNT(i.id) as incidencias_activas,
                CASE 
                    WHEN COUNT(i.id) = 0 THEN 'libre'
                    ELSE 'ocupado'
                END as estado,
                GROUP_CONCAT(
                    CASE 
                        WHEN i.id IS NOT NULL 
                        THEN CONCAT(w.station_code, ' (', i.status, ')') 
                    END
                    SEPARATOR ', '
                ) as incidencias_detalle
            FROM users u
            LEFT JOIN incidents i ON u.id = i.assigned_to_id 
                AND i.status IN ('en_proceso', 'en_supervision')
            LEFT JOIN workstations w ON i.workstation_id = w.id
            WHERE u.role = 'technician'
            GROUP BY u.id, u.full_name, u.sede, u.departamento
            ORDER BY u.sede, u.full_name
        `);
        
        res.json(rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener calificaciones de un técnico
// @route   GET /api/incidents/ratings/:technicianId
// @access  Private
exports.getTechnicianRatings = async (req, res) => {
    try {
        const db = require('../config/db');
        const { technicianId } = req.params;
        
        const [rows] = await db.execute(`
            SELECT 
                tr.id,
                tr.incident_id,
                tr.rating,
                tr.feedback,
                tr.created_at,
                u.full_name as rated_by_name,
                w.station_code,
                i.failure_type,
                i.description as incident_description
            FROM technician_ratings tr
            JOIN users u ON tr.rated_by_id = u.id
            JOIN incidents i ON tr.incident_id = i.id
            JOIN workstations w ON i.workstation_id = w.id
            WHERE tr.technician_id = ?
            ORDER BY tr.created_at DESC
        `, [technicianId]);
        
        // Calcular promedio de calificaciones
        const [avgResult] = await db.execute(`
            SELECT 
                AVG(rating) as average_rating,
                COUNT(*) as total_ratings
            FROM technician_ratings 
            WHERE technician_id = ?
        `, [technicianId]);
        
        res.json({
            ratings: rows,
            average_rating: parseFloat(avgResult[0].average_rating || 0).toFixed(1),
            total_ratings: avgResult[0].total_ratings || 0
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener calificaciones de mis incidencias (para técnicos)
// @route   GET /api/incidents/my-ratings
// @access  Private (Technician)
exports.getMyRatings = async (req, res) => {
    try {
        const db = require('../config/db');
        
        const [rows] = await db.execute(`
            SELECT 
                tr.id,
                tr.incident_id,
                tr.rating,
                tr.feedback,
                tr.created_at,
                u.full_name as rated_by_name,
                w.station_code,
                i.failure_type,
                i.description as incident_description
            FROM technician_ratings tr
            JOIN users u ON tr.rated_by_id = u.id
            JOIN incidents i ON tr.incident_id = i.id
            JOIN workstations w ON i.workstation_id = w.id
            WHERE tr.technician_id = ?
            ORDER BY tr.created_at DESC
        `, [req.user.id]);
        
        // Calcular promedio de calificaciones
        const [avgResult] = await db.execute(`
            SELECT 
                AVG(rating) as average_rating,
                COUNT(*) as total_ratings
            FROM technician_ratings 
            WHERE technician_id = ?
        `, [req.user.id]);
        
        res.json({
            ratings: rows,
            average_rating: parseFloat(avgResult[0].average_rating || 0).toFixed(1),
            total_ratings: avgResult[0].total_ratings || 0
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener ranking de técnicos por ciudad (mejores y peores)
// @route   GET /api/incidents/stats/technicians-ranking
// @access  Private (Admin)
exports.getTechniciansRanking = async (req, res) => {
    try {
        const db = require('../config/db');
        
        // Obtener todas las ciudades
        const cities = ['bogota', 'barranquilla', 'villavicencio'];
        const rankingData = {};
        
        for (const city of cities) {
            // Obtener técnicos de esta ciudad con sus promedios de calificación
            const [rows] = await db.execute(`
                SELECT 
                    u.id,
                    u.full_name,
                    u.sede,
                    u.departamento,
                    COALESCE(AVG(tr.rating), 0) as average_rating,
                    COUNT(tr.rating) as total_ratings,
                    COUNT(DISTINCT tr.incident_id) as total_incidents_rated
                FROM users u
                LEFT JOIN technician_ratings tr ON u.id = tr.technician_id
                WHERE u.role = 'technician' AND u.sede = ?
                GROUP BY u.id, u.full_name, u.sede, u.departamento
                HAVING COUNT(tr.rating) > 0
                ORDER BY average_rating DESC, total_ratings DESC
            `, [city]);
            
            const cityLabel = city === 'bogota' ? 'Bogotá' : 
                             city === 'barranquilla' ? 'Barranquilla' : 
                             city === 'villavicencio' ? 'Villavicencio' : city;
            
            // Separar en mejores (top 3) y peores (bottom 3)
            const topTechnicians = rows.slice(0, 3);
            const worstTechnicians = rows.slice(-3).reverse(); // Los últimos 3, en orden inverso
            
            rankingData[city] = {
                city: cityLabel,
                topTechnicians: topTechnicians.map(tech => ({
                    ...tech,
                    average_rating: parseFloat(tech.average_rating).toFixed(1)
                })),
                worstTechnicians: worstTechnicians.map(tech => ({
                    ...tech,
                    average_rating: parseFloat(tech.average_rating).toFixed(1)
                })),
                totalTechnicians: rows.length
            };
        }
        
        res.json(rankingData);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener top 10 coordinadores con más incidencias sin cerrar
// @route   GET /api/incidents/stats/coordinators-ranking
// @access  Private (Admin)
exports.getCoordinatorsRanking = async (req, res) => {
    try {
        const db = require('../config/db');
        
        const [rows] = await db.execute(`
            SELECT 
                u.id,
                u.full_name,
                u.role,
                u.sede,
                u.departamento,
                COUNT(i.id) as incidencias_sin_cerrar,
                COUNT(CASE WHEN i.status = 'pendiente' THEN 1 END) as pendientes,
                COUNT(CASE WHEN i.status = 'en_proceso' THEN 1 END) as en_proceso,
                COUNT(CASE WHEN i.status = 'en_supervision' THEN 1 END) as en_supervision,
                GROUP_CONCAT(
                    CONCAT(w.station_code, ' (', i.status, ')') 
                    ORDER BY i.created_at DESC
                    SEPARATOR ', '
                ) as incidencias_detalle
            FROM users u
            LEFT JOIN incidents i ON u.id = i.reported_by_id 
                AND i.status IN ('pendiente', 'en_proceso', 'en_supervision')
            LEFT JOIN workstations w ON i.workstation_id = w.id
            WHERE u.role IN ('coordinador', 'jefe_operaciones', 'administrativo', 'supervisor')
            GROUP BY u.id, u.full_name, u.role, u.sede, u.departamento
            ORDER BY incidencias_sin_cerrar DESC, u.full_name ASC
            LIMIT 10
        `);
        
        res.json(rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Exportar incidencias más viejas sin resolver a Excel
// @route   GET /api/incidents/export/old-incidents
// @access  Private (Admin)
exports.exportOldIncidents = async (req, res) => {
    try {
        const db = require('../config/db');
        const { limit = 10 } = req.query; // Por defecto, las 10 más viejas
        
        const [rows] = await db.query(`
            SELECT 
                i.id as ID,
                i.created_at as fecha_creacion,
                i.updated_at as ultima_actualizacion,
                i.status as estado,
                i.failure_type as tipo_falla,
                i.description as descripcion,
                w.station_code as codigo_estacion,
                w.sede as sede,
                w.departamento as departamento,
                w.location_details as ubicacion,
                w.anydesk_address as anydesk,
                w.advisor_cedula as cedula_asesor,
                reporter.full_name as reportado_por,
                reporter.role as rol_reportante,
                tech.full_name as tecnico_asignado,
                DATEDIFF(CURDATE(), DATE(i.created_at)) as dias_desde_creacion,
                TIMESTAMPDIFF(HOUR, i.created_at, NOW()) as horas_sin_resolver,
                CASE 
                    WHEN i.status = 'pendiente' THEN 'Pendiente'
                    WHEN i.status = 'en_proceso' THEN 'En Proceso'
                    WHEN i.status = 'en_supervision' THEN 'En Supervisión'
                    WHEN i.status = 'aprobado' THEN 'Aprobado'
                    ELSE i.status
                END as estado_legible
            FROM incidents i
            JOIN workstations w ON i.workstation_id = w.id
            JOIN users reporter ON i.reported_by_id = reporter.id
            LEFT JOIN users tech ON i.assigned_to_id = tech.id
            WHERE i.status IN ('pendiente', 'en_proceso', 'en_supervision')
            ORDER BY i.created_at ASC
            LIMIT ${parseInt(limit)}
        `);
        
        // Transformar los datos para tener nombres de columnas en español
        const transformedRows = rows.map(row => ({
            'ID': row.ID,
            'Fecha Creación': row.fecha_creacion,
            'Última Actualización': row.ultima_actualizacion,
            'Estado': row.estado,
            'Tipo de Falla': row.tipo_falla,
            'Descripción': row.descripcion,
            'Código Estación': row.codigo_estacion,
            'Sede': row.sede,
            'Departamento': row.departamento,
            'Ubicación': row.ubicacion,
            'AnyDesk': row.anydesk,
            'Cédula Asesor': row.cedula_asesor,
            'Reportado Por': row.reportado_por,
            'Rol Reportante': row.rol_reportante,
            'Técnico Asignado': row.tecnico_asignado,
            'Días Desde Creación': row.dias_desde_creacion,
            'Horas Sin Resolver': row.horas_sin_resolver,
            'Estado Legible': row.estado_legible
        }));
        
        res.json(transformedRows);
    } catch (err) {
        console.error('Error en exportOldIncidents:', err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Enviar alerta a responsables de incidencias pendientes de aprobación
// @route   POST /api/incidents/send-alerts
// @access  Private (Solo Admin)
exports.sendApprovalAlerts = async (req, res) => {
    try {
        const { incident_ids, alert_message } = req.body;

        // Solo admins pueden enviar alertas
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Solo los administradores pueden enviar alertas' });
        }

        if (!incident_ids || !Array.isArray(incident_ids) || incident_ids.length === 0) {
            return res.status(400).json({ msg: 'Se requiere una lista de IDs de incidencias' });
        }

        if (!alert_message || alert_message.trim().length === 0) {
            return res.status(400).json({ msg: 'El mensaje de alerta es requerido' });
        }

        const db = require('../config/db');
        const placeholders = incident_ids.map(() => '?').join(',');
        
        // Obtener información de las incidencias y sus responsables
        const [incidents] = await db.query(`
            SELECT DISTINCT
                i.id as incident_id,
                i.created_at,
                i.updated_at,
                w.station_code,
                w.sede,
                w.departamento,
                reporter.id as reporter_id,
                reporter.full_name as reporter_name,
                reporter.role as reporter_role,
                TIMESTAMPDIFF(HOUR, i.updated_at, NOW()) as hours_in_supervision
            FROM incidents i
            JOIN workstations w ON i.workstation_id = w.id
            JOIN users reporter ON i.reported_by_id = reporter.id
            WHERE i.id IN (${placeholders}) 
            AND i.status = 'en_supervision'
        `, incident_ids);

        if (incidents.length === 0) {
            return res.status(404).json({ msg: 'No se encontraron incidencias válidas en supervisión' });
        }

        // Agrupar incidencias por responsable
        const alertsByUser = {};
        incidents.forEach(incident => {
            const userId = incident.reporter_id;
            if (!alertsByUser[userId]) {
                alertsByUser[userId] = {
                    user_info: {
                        id: incident.reporter_id,
                        name: incident.reporter_name,
                        role: incident.reporter_role
                    },
                    incidents: []
                };
            }
            alertsByUser[userId].incidents.push({
                id: incident.incident_id,
                station_code: incident.station_code,
                sede: incident.sede,
                departamento: incident.departamento,
                hours_in_supervision: incident.hours_in_supervision
            });
        });

        // Crear registros de alertas en la base de datos
        const alertsCreated = [];
        for (const userId in alertsByUser) {
            const userAlerts = alertsByUser[userId];
            const incidentList = userAlerts.incidents.map(inc => 
                `${inc.station_code} (${inc.hours_in_supervision}h)`
            ).join(', ');
            
            const fullMessage = `${alert_message}\n\nIncidencias pendientes: ${incidentList}`;
            
            // Insertar alerta en la base de datos
            // Para cada incidencia, crear una alerta separada
            for (const incident of userAlerts.incidents) {
                const [result] = await db.execute(`
                    INSERT INTO supervision_alerts 
                    (incident_id, coordinator_id, alert_message) 
                    VALUES (?, ?, ?)
                `, [
                    incident.id,
                    userId, 
                    alert_message
                ]);
                
                alertsCreated.push({
                    alert_id: result.insertId,
                    incident_id: incident.id,
                    sent_to: userAlerts.user_info,
                    message: alert_message
                });
            }
        }

        res.json({
            msg: `Alertas enviadas exitosamente a ${Object.keys(alertsByUser).length} responsable(s)`,
            alerts_sent: alertsCreated.length,
            recipients: alertsCreated.map(alert => ({
                name: alert.sent_to.name,
                role: alert.sent_to.role,
                incidents_count: alert.incidents_count
            }))
        });

    } catch (err) {
        console.error('Error enviando alertas:', err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener alertas para el usuario actual
// @route   GET /api/incidents/my-alerts
// @access  Private
exports.getMyAlerts = async (req, res) => {
    try {
        const db = require('../config/db');
        
        const [alerts] = await db.query(`
            SELECT 
                sa.id,
                sa.alert_message as message,
                sa.incident_id,
                sa.status,
                sa.created_at,
                sa.read_at
            FROM supervision_alerts sa
            WHERE sa.coordinator_id = ?
            ORDER BY sa.created_at DESC
            LIMIT 50
        `, [req.user.id]);

        res.json({
            alerts,
            unread_count: alerts.filter(alert => alert.status === 'active').length
        });

    } catch (err) {
        console.error('Error obteniendo alertas:', err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Marcar alerta como leída
// @route   PUT /api/incidents/alerts/:id/read
// @access  Private
exports.markAlertAsRead = async (req, res) => {
    try {
        const db = require('../config/db');
        const alertId = req.params.id;
        
        const [result] = await db.execute(`
            UPDATE supervision_alerts 
            SET status = 'read', read_at = CURRENT_TIMESTAMP 
            WHERE id = ? AND coordinator_id = ? AND status = 'active'
        `, [alertId, req.user.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Alerta no encontrada o ya fue leída' });
        }

        res.json({ msg: 'Alerta marcada como leída' });

    } catch (err) {
        console.error('Error marcando alerta como leída:', err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Descartar alerta
// @route   PUT /api/incidents/alerts/:id/dismiss
// @access  Private
exports.dismissAlert = async (req, res) => {
    try {
        const db = require('../config/db');
        const alertId = req.params.id;
        
        const [result] = await db.execute(`
            UPDATE supervision_alerts 
            SET status = 'dismissed', dismissed_at = CURRENT_TIMESTAMP
            WHERE id = ? AND coordinator_id = ?
        `, [alertId, req.user.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Alerta no encontrada' });
        }

        res.json({ msg: 'Alerta descartada' });

    } catch (err) {
        console.error('Error descartando alerta:', err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Corregir y reenviar incidencia devuelta
// @route   PUT /api/incidents/:id/correct
// @access  Private (solo el creador de la incidencia)
exports.correctIncident = async (req, res) => {
    const { description, anydesk_address, advisor_cedula, puesto_numero, failure_type } = req.body;

    try {
        const corrections = {};
        
        // Solo incluir campos que fueron proporcionados
        if (description !== undefined) corrections.description = description;
        if (anydesk_address !== undefined) corrections.anydesk_address = anydesk_address;
        if (advisor_cedula !== undefined) corrections.advisor_cedula = advisor_cedula;
        if (puesto_numero !== undefined) corrections.puesto_numero = puesto_numero;
        if (failure_type !== undefined) corrections.failure_type = failure_type;

        // Validar que al menos una corrección fue proporcionada
        if (Object.keys(corrections).length === 0) {
            return res.status(400).json({ msg: 'Debes proporcionar al menos una corrección' });
        }

        await Incident.correctAndResubmit(req.params.id, req.user.id, corrections);

        res.json({
            msg: 'Incidencia corregida y reenviada exitosamente. Ahora está disponible para asignación.',
            corrections_applied: Object.keys(corrections)
        });
    } catch (err) {
        console.error('Error corrigiendo incidencia:', err.message);
        res.status(500).json({ msg: err.message });
    }
};

// @desc    Obtener incidencias creadas por el usuario actual
// @route   GET /api/incidents/my-reports
// @access  Private (coordinadores, supervisores, administrativos, jefes)
exports.getMyReports = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [incidents] = await db.query(`
            SELECT 
                i.id,
                i.status,
                i.failure_type,
                i.description,
                i.created_at,
                i.updated_at,
                i.assigned_to_id,
                w.anydesk_address,
                w.advisor_cedula,
                i.puesto_numero,
                i.return_reason,
                i.return_count,
                i.returned_at,
                w.station_code,
                w.sede,
                w.departamento,
                w.location_details,
                tech.full_name as technician_name,
                returned_by.full_name as returned_by_name
            FROM incidents i
            JOIN workstations w ON i.workstation_id = w.id
            LEFT JOIN users tech ON i.assigned_to_id = tech.id
            LEFT JOIN users returned_by ON i.returned_by_id = returned_by.id
            WHERE i.reported_by_id = ?
            ORDER BY 
                CASE 
                    WHEN i.status = 'devuelto' THEN 1
                    WHEN i.status = 'en_supervision' THEN 2
                    WHEN i.status = 'en_proceso' THEN 3
                    WHEN i.status = 'pendiente' THEN 4
                    ELSE 5
                END,
                i.updated_at DESC
        `, [userId]);

        // Agregar estadísticas del usuario
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'pendiente' THEN 1 END) as pendiente,
                COUNT(CASE WHEN status = 'en_proceso' THEN 1 END) as en_proceso,
                COUNT(CASE WHEN status = 'en_supervision' THEN 1 END) as en_supervision,
                COUNT(CASE WHEN status = 'aprobado' THEN 1 END) as aprobado,
                COUNT(CASE WHEN status = 'rechazado' THEN 1 END) as rechazado,
                COUNT(CASE WHEN status = 'devuelto' THEN 1 END) as devuelto
            FROM incidents 
            WHERE reported_by_id = ?
        `, [userId]);

        res.json({
            incidents,
            stats: stats[0]
        });
    } catch (err) {
        console.error('Error obteniendo reportes del usuario:', err.message);
        res.status(500).send('Error del servidor');
    }
};