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
        
        const incidents = await Incident.getVisibleForUser(
            userRole, 
            userSede, 
            status, 
            assigned_to, 
            { departamento, sede },
            userDepartamento
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
        
        const incidents = await Incident.getVisibleForUser(userRole, userSede, null, req.user.id, {}, userDepartamento);
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
            userDepartamento
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
        
        const incidents = await Incident.getVisibleForUser(userRole, userSede, 'en_supervision', null, {}, userDepartamento);
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
        
        const incidents = await Incident.getApprovedIncidentsForUser(userRole, userSede, userDepartamento);
        
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
    const incidentSede = sede || req.user.sede || 'bogota';
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

    // Validar departamentos según la sede
    const validDepartamentos = incidentSede === 'bogota' 
        ? ['obama', 'majority', 'claro'] 
        : ['obama', 'claro']; // Villavicencio y Barranquilla no tienen majority
        
    if (!validDepartamentos.includes(departamento)) {
        return res.status(400).json({ 
            msg: `Departamento no válido para ${incidentSede}. Debe ser: ${validDepartamentos.join(', ')}` 
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
        
        // Crear o encontrar la estación de trabajo
        let workstation;
        
        if (incidentSede === 'barranquilla') {
            // Para Barranquilla, crear/actualizar con campos de trabajo remoto
            const existingStation = await Workstation.getByStationCode(stationCode);
            
            if (existingStation) {
                // Actualizar estación existente con nuevos datos remotos
                await Workstation.update(existingStation.id, {
                    ...existingStation,
                    anydesk_address,
                    advisor_cedula
                });
                workstation = { ...existingStation, anydesk_address, advisor_cedula };
            } else {
                // Crear nueva estación con datos remotos
                workstation = await Workstation.create({
                    station_code: stationCode,
                    location_details: `Puesto ${stationCode} - ${departamento.toUpperCase()} (Remoto)`,
                    sede: incidentSede,
                    departamento,
                    anydesk_address,
                    advisor_cedula
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
    const { sede, departamento, puesto_numero, failure_type, description, anydesk_address, advisor_cedula, advisor_contact } = req.body;

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
    const puestoNum = incidentSede === 'barranquilla' ? 1 : parseInt(puesto_numero);

    if (incidentSede !== 'barranquilla' && (!puesto_numero || isNaN(puestoNum) || puestoNum < 1 || puestoNum > 300)) {
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
        if (!advisor_contact) {
            return res.status(400).json({ 
                msg: 'El número de contacto del asesor es requerido para incidencias en Barranquilla' 
            });
        }
    }

    // Validar departamentos según la sede
    const validDepartamentos = incidentSede === 'bogota' 
        ? ['obama', 'majority', 'claro'] 
        : ['obama', 'claro']; // Villavicencio y Barranquilla no tienen majority
        
    if (!validDepartamentos.includes(departamento)) {
        return res.status(400).json({ 
            msg: `Departamento no válido para ${incidentSede}. Debe ser: ${validDepartamentos.join(', ')}` 
        });
    }

    const validFailureTypes = ['pantalla', 'perifericos', 'internet', 'software', 'otro'];
    if (!validFailureTypes.includes(failure_type)) {
        return res.status(400).json({ 
            msg: 'Tipo de falla no válido. Debe ser: pantalla, perifericos, internet, software u otro' 
        });
    }

    function generateStationCode(sede, departamento, puestoNumero) {
        const sedeCode = sede.toUpperCase().charAt(0);
        const deptoCode = departamento.toUpperCase().substring(0, 3);
        return `${sedeCode}-${deptoCode}-${puestoNumero.toString().padStart(3, '0')}`;
    }

    try {
        // Generar código de estación automáticamente
        const stationCode = generateStationCode(incidentSede, departamento, puestoNum);
        
        // Crear o encontrar la estación de trabajo
        let workstation;
        
        if (incidentSede === 'barranquilla') {
            // Para Barranquilla, crear/actualizar con campos de trabajo remoto
            const existingStation = await Workstation.getByStationCode(stationCode);
            
            if (existingStation) {
                // Actualizar estación existente con nuevos datos remotos
                await Workstation.update(existingStation.id, {
                    ...existingStation,
                    anydesk_address,
                    advisor_cedula,
                    advisor_contact
                });
                workstation = { ...existingStation, anydesk_address, advisor_cedula, advisor_contact };
            } else {
                // Crear nueva estación con datos remotos
                workstation = await Workstation.create({
                    station_code: stationCode,
                    location_details: `Puesto ${stationCode} - ${departamento.toUpperCase()} (Remoto)`,
                    sede: incidentSede,
                    departamento,
                    anydesk_address,
                    advisor_cedula,
                    advisor_contact
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
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// Función para generar código de estación
const generateStationCode = (sede, departamento, puestoNumero) => {
    const sedePrefixes = {
        'bogota': '',
        'barranquilla': 'BAQ-',
        'villavicencio': 'VVC-'
    };
    
    const deptPrefixes = {
        'obama': 'O',
        'majority': 'M', 
        'claro': 'C'
    };
    
    const sedePrefix = sedePrefixes[sede] || '';
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
        
        const [rows] = await db.execute(`
            SELECT 
                w.sede,
                COUNT(CASE WHEN i.status = 'pendiente' THEN 1 END) as pendientes,
                COUNT(CASE WHEN i.status = 'en_proceso' THEN 1 END) as en_proceso,
                COUNT(CASE WHEN i.status = 'en_supervision' THEN 1 END) as en_supervision,
                COUNT(CASE WHEN i.status = 'aprobado' THEN 1 END) as aprobadas,
                COUNT(*) as total
            FROM incidents i
            JOIN workstations w ON i.workstation_id = w.id
            GROUP BY w.sede
            ORDER BY w.sede
        `);
        
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