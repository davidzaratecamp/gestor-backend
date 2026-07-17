const Workstation = require('../models/Workstation');
const db = require('../config/db');

// @desc    Obtener estadísticas de todas las estaciones con conteo de incidencias
// @route   GET /api/workstations/stats
// @access  Private (Admin)
exports.getWorkstationStats = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                w.id AS workstation_id,
                w.station_code,
                w.sede,
                w.departamento,
                w.location_details,
                w.anydesk_address,
                w.advisor_cedula,
                w.created_at,
                COUNT(i.id) AS total_incidents,
                COUNT(CASE WHEN i.status IN ('pendiente','en_proceso','en_supervision','devuelto') THEN 1 END) AS pending_incidents,
                COUNT(CASE WHEN i.status = 'aprobado' THEN 1 END) AS resolved_incidents,
                COUNT(CASE WHEN i.status = 'rechazado' THEN 1 END) AS rejected_incidents,
                COUNT(CASE WHEN i.failure_type = 'pantalla'   THEN 1 END) AS pantalla_count,
                COUNT(CASE WHEN i.failure_type = 'perifericos' THEN 1 END) AS perifericos_count,
                COUNT(CASE WHEN i.failure_type = 'internet'   THEN 1 END) AS internet_count,
                COUNT(CASE WHEN i.failure_type = 'software'   THEN 1 END) AS software_count,
                COUNT(CASE WHEN i.failure_type = 'otro'       THEN 1 END) AS otro_count,
                AVG(CASE WHEN i.status = 'aprobado'
                    THEN TIMESTAMPDIFF(HOUR, i.created_at, i.updated_at) END) AS avg_resolution_hours,
                MAX(i.created_at) AS last_incident_date
            FROM workstations w
            LEFT JOIN incidents i ON w.id = i.workstation_id
            GROUP BY
                w.id, w.station_code, w.sede, w.departamento,
                w.location_details, w.anydesk_address, w.advisor_cedula, w.created_at
            ORDER BY total_incidents DESC
        `);

        // Calcular risk_score en JS (misma lógica del frontend original)
        const result = rows.map(row => {
            const frequencyScore  = Math.min(row.total_incidents * 2, 40);
            const criticalScore   = Math.min((row.pantalla_count + row.internet_count) * 5, 30);
            const pendingScore    = Math.min(row.pending_incidents * 3, 20);

            let timeScore = 0;
            if (row.last_incident_date) {
                const daysSince = (Date.now() - new Date(row.last_incident_date)) / (1000 * 60 * 60 * 24);
                if (daysSince < 7)  timeScore = 10;
                else if (daysSince < 30) timeScore = 5;
            }

            return {
                ...row,
                avg_resolution_hours: row.avg_resolution_hours
                    ? parseFloat(row.avg_resolution_hours).toFixed(1)
                    : 0,
                risk_score: frequencyScore + criticalScore + pendingScore + timeScore
            };
        });

        res.json(result);
    } catch (err) {
        console.error('Error en getWorkstationStats:', err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener historial completo de incidencias de una estación
// @route   GET /api/workstations/:id/history
// @access  Private (Admin)
exports.getWorkstationHistory = async (req, res) => {
    try {
        const { id } = req.params;

        const [incidents] = await db.query(`
            SELECT
                i.id,
                i.failure_type,
                i.description,
                i.status,
                i.created_at,
                i.updated_at,
                i.return_count,
                reporter.full_name    AS reported_by_name,
                reporter.role         AS reported_by_role,
                tech.full_name        AS technician_name,
                supervisor.full_name  AS supervisor_name,
                TIMESTAMPDIFF(HOUR, i.created_at,
                    CASE WHEN i.status = 'aprobado' THEN i.updated_at ELSE NOW() END
                ) AS hours_open
            FROM incidents i
            JOIN users reporter    ON i.reported_by_id  = reporter.id
            LEFT JOIN users tech   ON i.assigned_to_id  = tech.id
            LEFT JOIN (
                SELECT DISTINCT ih.incident_id, u.full_name
                FROM incident_history ih
                JOIN users u ON ih.user_id = u.id
                WHERE ih.action = 'Aprobado por supervisor'
            ) sup ON i.id = sup.incident_id
            LEFT JOIN users supervisor ON sup.full_name = supervisor.full_name
            WHERE i.workstation_id = ?
            ORDER BY i.created_at DESC
        `, [id]);

        // Para cada incidencia, traer el historial de acciones
        const incidentIds = incidents.map(i => i.id);
        let historyMap = {};

        if (incidentIds.length > 0) {
            const placeholders = incidentIds.map(() => '?').join(',');
            const [history] = await db.query(`
                SELECT
                    ih.incident_id,
                    ih.action,
                    ih.details,
                    ih.timestamp,
                    u.full_name AS user_name,
                    u.role      AS user_role
                FROM incident_history ih
                JOIN users u ON ih.user_id = u.id
                WHERE ih.incident_id IN (${placeholders})
                ORDER BY ih.timestamp ASC
            `, incidentIds);

            history.forEach(h => {
                if (!historyMap[h.incident_id]) historyMap[h.incident_id] = [];
                historyMap[h.incident_id].push(h);
            });
        }

        const result = incidents.map(inc => ({
            ...inc,
            history: historyMap[inc.id] || []
        }));

        res.json(result);
    } catch (err) {
        console.error('Error en getWorkstationHistory:', err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener todas las estaciones de trabajo
// @route   GET /api/workstations
// @access  Private
exports.getAllWorkstations = async (req, res) => {
    try {
        // Obtener workstations visibles según el rol y sede del usuario
        const userRole = req.user.role;
        const userSede = req.user.sede;
        
        const workstations = await Workstation.getVisibleForUser(userRole, userSede);
        res.json(workstations);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener catálogo de puestos de Bogotá para el selector en cascada (Site 1 / Site 2 / Área Financiera)
// @route   GET /api/workstations/catalog?site=site1&departamento=claro
// @access  Private
exports.getStationCatalog = async (req, res) => {
    try {
        const { site, departamento } = req.query;
        const workstations = await Workstation.getCatalog(site || null, departamento || null);
        res.json(workstations);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener una estación de trabajo por ID
// @route   GET /api/workstations/:id
// @access  Private
exports.getWorkstationById = async (req, res) => {
    try {
        const workstation = await Workstation.getById(req.params.id);
        
        if (!workstation) {
            return res.status(404).json({ msg: 'Estación de trabajo no encontrada' });
        }
        
        res.json(workstation);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Crear nueva estación de trabajo
// @route   POST /api/workstations
// @access  Private (Admin)
exports.createWorkstation = async (req, res) => {
    const { station_code, location_details, sede, departamento, anydesk_address, advisor_cedula } = req.body;

    // Validaciones
    if (!station_code) {
        return res.status(400).json({ msg: 'El código de estación es requerido' });
    }

    // Validaciones especiales para Barranquilla (trabajo remoto)
    if (sede === 'barranquilla') {
        if (!anydesk_address) {
            return res.status(400).json({ msg: 'La dirección AnyDesk es requerida para estaciones de Barranquilla' });
        }
        if (!advisor_cedula) {
            return res.status(400).json({ msg: 'La cédula del asesor es requerida para estaciones de Barranquilla' });
        }
    }

    try {
        // Verificar si ya existe una estación con ese código
        const existingWorkstation = await Workstation.getByStationCode(station_code);
        if (existingWorkstation) {
            return res.status(400).json({ msg: 'Ya existe una estación con ese código' });
        }

        const workstationData = {
            station_code,
            location_details: location_details || '',
            sede: sede || 'bogota',
            departamento: departamento || 'claro'
        };

        // Agregar campos de trabajo remoto si es Barranquilla
        if (sede === 'barranquilla') {
            workstationData.anydesk_address = anydesk_address;
            workstationData.advisor_cedula = advisor_cedula;
        }

        const newWorkstation = await Workstation.create(workstationData);

        res.status(201).json({
            msg: 'Estación de trabajo creada exitosamente',
            workstation: newWorkstation
        });
    } catch (err) {
        console.error(err.message);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ msg: 'Ya existe una estación con ese código' });
        }
        res.status(500).send('Error del servidor');
    }
};

// @desc    Actualizar estación de trabajo
// @route   PUT /api/workstations/:id
// @access  Private (Admin)
exports.updateWorkstation = async (req, res) => {
    const { station_code, location_details, sede, departamento, anydesk_address, advisor_cedula } = req.body;

    if (!station_code) {
        return res.status(400).json({ msg: 'El código de estación es requerido' });
    }

    // Validaciones especiales para Barranquilla (trabajo remoto)
    if (sede === 'barranquilla') {
        if (!anydesk_address) {
            return res.status(400).json({ msg: 'La dirección AnyDesk es requerida para estaciones de Barranquilla' });
        }
        if (!advisor_cedula) {
            return res.status(400).json({ msg: 'La cédula del asesor es requerida para estaciones de Barranquilla' });
        }
    }

    try {
        const workstationExists = await Workstation.getById(req.params.id);
        if (!workstationExists) {
            return res.status(404).json({ msg: 'Estación de trabajo no encontrada' });
        }

        // Verificar si el nuevo código ya existe en otra estación
        const existingWorkstation = await Workstation.getByStationCode(station_code);
        if (existingWorkstation && existingWorkstation.id !== parseInt(req.params.id)) {
            return res.status(400).json({ msg: 'Ya existe otra estación con ese código' });
        }

        const updateData = {
            station_code,
            location_details: location_details || '',
            sede: sede || 'bogota',
            departamento: departamento || 'claro'
        };

        // Manejar campos de trabajo remoto
        updateData.anydesk_address = sede === 'barranquilla' ? anydesk_address : null;
        updateData.advisor_cedula = sede === 'barranquilla' ? advisor_cedula : null;

        const updated = await Workstation.update(req.params.id, updateData);

        if (updated) {
            res.json({ msg: 'Estación de trabajo actualizada exitosamente' });
        } else {
            res.status(400).json({ msg: 'No se pudo actualizar la estación de trabajo' });
        }
    } catch (err) {
        console.error(err.message);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ msg: 'Ya existe una estación con ese código' });
        }
        res.status(500).send('Error del servidor');
    }
};

// @desc    Eliminar estación de trabajo
// @route   DELETE /api/workstations/:id
// @access  Private (Admin)
exports.deleteWorkstation = async (req, res) => {
    try {
        const workstation = await Workstation.getById(req.params.id);
        if (!workstation) {
            return res.status(404).json({ msg: 'Estación de trabajo no encontrada' });
        }

        const deleted = await Workstation.delete(req.params.id);
        
        if (deleted) {
            res.json({ msg: 'Estación de trabajo eliminada exitosamente' });
        } else {
            res.status(400).json({ msg: 'No se pudo eliminar la estación de trabajo' });
        }
    } catch (err) {
        console.error(err.message);
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ 
                msg: 'No se puede eliminar la estación porque tiene incidencias asociadas' 
            });
        }
        res.status(500).send('Error del servidor');
    }
};