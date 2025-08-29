const db = require('../config/db');

class Incident {
    static async getAll(status = null, assignedTo = null) {
        try {
            let query = `
                SELECT 
                    i.id,
                    i.failure_type,
                    i.description,
                    i.status,
                    i.created_at,
                    i.updated_at,
                    w.station_code,
                    w.location_details,
                    w.sede,
                    w.departamento,
                    reporter.full_name AS reported_by_name,
                    assigned.full_name AS assigned_to_name,
                    assigned.id AS assigned_to_id
                FROM incidents i
                JOIN workstations w ON i.workstation_id = w.id
                JOIN users reporter ON i.reported_by_id = reporter.id
                LEFT JOIN users assigned ON i.assigned_to_id = assigned.id
                WHERE 1=1
            `;
            
            const params = [];
            
            if (status) {
                query += ' AND i.status = ?';
                params.push(status);
            }
            
            if (assignedTo) {
                query += ' AND i.assigned_to_id = ?';
                params.push(assignedTo);
            }
            
            query += ' ORDER BY i.created_at DESC';
            
            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getById(id) {
        try {
            const [rows] = await db.query(`
                SELECT 
                    i.*,
                    w.station_code,
                    w.location_details,
                    reporter.full_name AS reported_by_name,
                    assigned.full_name AS assigned_to_name
                FROM incidents i
                JOIN workstations w ON i.workstation_id = w.id
                JOIN users reporter ON i.reported_by_id = reporter.id
                LEFT JOIN users assigned ON i.assigned_to_id = assigned.id
                WHERE i.id = ?
            `, [id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async create(incidentData) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            const { workstation_id, reported_by_id, failure_type, description } = incidentData;
            
            const [result] = await connection.query(`
                INSERT INTO incidents (workstation_id, reported_by_id, failure_type, description, status) 
                VALUES (?, ?, ?, ?, 'pendiente')
            `, [workstation_id, reported_by_id, failure_type, description]);

            const incidentId = result.insertId;

            // Registrar en el historial
            await connection.query(`
                INSERT INTO incident_history (incident_id, user_id, action, details) 
                VALUES (?, ?, 'Creación', 'Incidencia creada por el supervisor')
            `, [incidentId, reported_by_id]);

            await connection.commit();
            
            return { id: incidentId, ...incidentData, status: 'pendiente' };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async assignTechnician(incidentId, technicianId, assignedBy) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            const [result] = await connection.query(`
                UPDATE incidents 
                SET assigned_to_id = ?, status = 'en_proceso', updated_at = CURRENT_TIMESTAMP 
                WHERE id = ? AND status = 'pendiente'
            `, [technicianId, incidentId]);

            if (result.affectedRows === 0) {
                throw new Error('No se pudo asignar técnico. La incidencia no existe o no está pendiente.');
            }

            // Registrar en el historial
            const [techUser] = await connection.query('SELECT full_name FROM users WHERE id = ?', [technicianId]);
            const techName = techUser[0]?.full_name || 'Técnico';

            await connection.query(`
                INSERT INTO incident_history (incident_id, user_id, action, details) 
                VALUES (?, ?, 'Asignación de técnico', ?)
            `, [incidentId, assignedBy, `Asignado a: ${techName}`]);

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async markAsResolved(incidentId, technicianId, resolutionNotes = '') {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            const [result] = await connection.query(`
                UPDATE incidents 
                SET status = 'en_supervision', updated_at = CURRENT_TIMESTAMP 
                WHERE id = ? AND assigned_to_id = ? AND status = 'en_proceso'
            `, [incidentId, technicianId]);

            if (result.affectedRows === 0) {
                throw new Error('No se pudo marcar como resuelto. Verifica que tengas asignada esta incidencia.');
            }

            // Registrar en el historial
            await connection.query(`
                INSERT INTO incident_history (incident_id, user_id, action, details) 
                VALUES (?, ?, 'Marcado como resuelto', ?)
            `, [incidentId, technicianId, `Técnico reporta solución: ${resolutionNotes}`]);

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async approve(incidentId, supervisorId, approvalNotes = '') {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            const [result] = await connection.query(`
                UPDATE incidents 
                SET status = 'aprobado', updated_at = CURRENT_TIMESTAMP 
                WHERE id = ? AND status = 'en_supervision'
            `, [incidentId]);

            if (result.affectedRows === 0) {
                throw new Error('No se pudo aprobar. La incidencia no está en supervisión.');
            }

            // Registrar en el historial
            await connection.query(`
                INSERT INTO incident_history (incident_id, user_id, action, details) 
                VALUES (?, ?, 'Aprobado por supervisor', ?)
            `, [incidentId, supervisorId, `Incidencia aprobada: ${approvalNotes}`]);

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async reject(incidentId, supervisorId, rejectionReason) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            const [result] = await connection.query(`
                UPDATE incidents 
                SET status = 'en_proceso', updated_at = CURRENT_TIMESTAMP 
                WHERE id = ? AND status = 'en_supervision'
            `, [incidentId]);

            if (result.affectedRows === 0) {
                throw new Error('No se pudo rechazar. La incidencia no está en supervisión.');
            }

            // Registrar en el historial
            await connection.query(`
                INSERT INTO incident_history (incident_id, user_id, action, details) 
                VALUES (?, ?, 'Rechazado por supervisor', ?)
            `, [incidentId, supervisorId, `Motivo del rechazo: ${rejectionReason}`]);

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getHistory(incidentId) {
        try {
            const [rows] = await db.query(`
                SELECT 
                    ih.*,
                    u.full_name AS user_name,
                    tr.rating as technician_rating,
                    tr.feedback as rating_feedback,
                    rater.full_name as rated_by_name
                FROM incident_history ih
                JOIN users u ON ih.user_id = u.id
                LEFT JOIN technician_ratings tr ON ih.incident_id = tr.incident_id 
                    AND ih.action = 'approved'
                LEFT JOIN users rater ON tr.rated_by_id = rater.id
                WHERE ih.incident_id = ?
                ORDER BY ih.timestamp ASC
            `, [incidentId]);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getApprovedIncidents() {
        try {
            const [rows] = await db.query(`
                SELECT 
                    i.id,
                    i.failure_type,
                    i.description,
                    i.created_at,
                    i.updated_at,
                    w.station_code,
                    w.location_details,
                    w.sede,
                    w.departamento,
                    reporter.full_name AS reported_by_name,
                    assigned.full_name AS technician_name
                FROM incidents i
                JOIN workstations w ON i.workstation_id = w.id
                JOIN users reporter ON i.reported_by_id = reporter.id
                LEFT JOIN users assigned ON i.assigned_to_id = assigned.id
                WHERE i.status = 'aprobado'
                ORDER BY i.updated_at DESC
            `);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getApprovedIncidentsForUser(userRole, userSede, userDepartamento = null) {
        try {
            let query = `
                SELECT 
                    i.id,
                    i.failure_type,
                    i.description,
                    i.created_at,
                    i.updated_at,
                    w.station_code,
                    w.location_details,
                    w.sede,
                    w.departamento,
                    reporter.full_name AS reported_by_name,
                    assigned.full_name AS technician_name
                FROM incidents i
                JOIN workstations w ON i.workstation_id = w.id
                JOIN users reporter ON i.reported_by_id = reporter.id
                LEFT JOIN users assigned ON i.assigned_to_id = assigned.id
                WHERE i.status = 'aprobado'
            `;
            
            const params = [];
            
            // Filtros de visibilidad por rol y sede
            if (userRole === 'technician') {
                // Técnicos de Bogotá y Villavicencio pueden ver Barranquilla (trabajo remoto)
                if (userSede === 'bogota') {
                    query += ' AND w.sede IN ("bogota", "barranquilla")';
                } else if (userSede === 'villavicencio') {
                    query += ' AND w.sede IN ("villavicencio", "barranquilla")';
                } else {
                    // Otros técnicos solo ven su sede
                    query += ' AND w.sede = ?';
                    params.push(userSede);
                }
            } else if (userRole === 'coordinador') {
                // Coordinadores solo ven incidencias de su propia sede
                query += ' AND w.sede = ?';
                params.push(userSede);
            } else if (userRole === 'jefe_operaciones') {
                // Jefes de operaciones ven solo su departamento en su sede
                query += ' AND w.sede = ? AND w.departamento = ?';
                params.push(userSede);
                params.push(userDepartamento);
            } else if (userRole === 'supervisor') {
                // Supervisores ven incidencias de su sede (mantener lógica original)
                if (userSede === 'bogota') {
                    query += ' AND w.sede IN ("bogota", "barranquilla")';
                } else if (userSede === 'villavicencio') {
                    query += ' AND w.sede IN ("villavicencio", "barranquilla")';
                } else {
                    query += ' AND w.sede = ?';
                    params.push(userSede);
                }
            }
            // Solo admin ve todo
            
            query += ' ORDER BY i.updated_at DESC';
            
            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getVisibleForUser(userRole, userSede, status = null, assignedTo = null, filters = {}, userDepartamento = null) {
        try {
            let query = `
                SELECT 
                    i.id,
                    i.failure_type,
                    i.description,
                    i.status,
                    i.created_at,
                    i.updated_at,
                    w.station_code,
                    w.location_details,
                    w.sede,
                    w.departamento,
                    reporter.full_name AS reported_by_name,
                    assigned.full_name AS assigned_to_name,
                    assigned.id AS assigned_to_id
                FROM incidents i
                JOIN workstations w ON i.workstation_id = w.id
                JOIN users reporter ON i.reported_by_id = reporter.id
                LEFT JOIN users assigned ON i.assigned_to_id = assigned.id
                WHERE 1=1
            `;
            
            const params = [];
            
            // Filtros de visibilidad por rol y sede
            if (userRole === 'technician') {
                // Técnicos de Bogotá y Villavicencio pueden ver Barranquilla (trabajo remoto)
                if (userSede === 'bogota') {
                    query += ' AND w.sede IN ("bogota", "barranquilla")';
                } else if (userSede === 'villavicencio') {
                    query += ' AND w.sede IN ("villavicencio", "barranquilla")';
                } else {
                    // Otros técnicos solo ven su sede
                    query += ' AND w.sede = ?';
                    params.push(userSede);
                }
            } else if (userRole === 'coordinador') {
                // Coordinadores solo ven incidencias de su propia sede
                query += ' AND w.sede = ?';
                params.push(userSede);
            } else if (userRole === 'jefe_operaciones') {
                // Jefes de operaciones ven solo su departamento en su sede
                query += ' AND w.sede = ? AND w.departamento = ?';
                params.push(userSede);
                params.push(userDepartamento);
            } else if (userRole === 'supervisor') {
                // Supervisores ven incidencias de su sede (mantener lógica original)
                if (userSede === 'bogota') {
                    query += ' AND w.sede IN ("bogota", "barranquilla")';
                } else if (userSede === 'villavicencio') {
                    query += ' AND w.sede IN ("villavicencio", "barranquilla")';
                } else {
                    query += ' AND w.sede = ?';
                    params.push(userSede);
                }
            }
            // Solo admin ve todo
            
            // Filtros adicionales
            if (status) {
                query += ' AND i.status = ?';
                params.push(status);
            }
            
            if (assignedTo) {
                query += ' AND i.assigned_to_id = ?';
                params.push(assignedTo);
            }
            
            // Filtros de campaña y sede (solo para admin)
            if (filters.departamento) {
                query += ' AND w.departamento = ?';
                params.push(filters.departamento);
            }
            
            if (filters.sede && userRole === 'admin') {
                // Solo admin puede filtrar por sede
                query += ' AND w.sede = ?';
                params.push(filters.sede);
            }
            
            query += ' ORDER BY i.created_at DESC';
            
            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Incident;