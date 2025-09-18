const db = require('../config/db');

class Incident {
    static async getAll(status = null, assignedTo = null, userRole = null, userSede = null, userDepartamento = null, userId = null, filters = {}) {
        try {
            // Si se pasan datos del usuario, usar la lógica de visibilidad SIEMPRE
            if (userRole && userId) {
                return await this.getVisibleForUser(userRole, userSede, status, assignedTo, filters, userDepartamento, userId);
            }
            
            // Lógica sin restricciones SOLO para casos especiales (migraciones, scripts, etc.)
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
                    w.anydesk_address,
                    w.advisor_cedula,
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
                    w.sede,
                    w.departamento,
                    w.anydesk_address,
                    w.advisor_cedula,
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

    static async reassignTechnician(incidentId, newTechnicianId, reassignedBy, reason = '') {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            // Obtener información actual de la incidencia
            const [currentIncident] = await connection.query(`
                SELECT i.*, u.full_name as current_tech_name 
                FROM incidents i 
                LEFT JOIN users u ON i.assigned_to_id = u.id 
                WHERE i.id = ? AND i.status != 'aprobado'
            `, [incidentId]);

            if (currentIncident.length === 0) {
                throw new Error('No se pudo reasignar. La incidencia no existe o ya fue aprobada.');
            }

            const incident = currentIncident[0];

            // Actualizar la asignación (funciona en cualquier estado excepto 'aprobado')
            // Si está en 'pendiente', cambiarlo a 'en_proceso'
            let newStatus = incident.status;
            if (incident.status === 'pendiente') {
                newStatus = 'en_proceso';
            }

            const [result] = await connection.query(`
                UPDATE incidents 
                SET assigned_to_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ? AND status != 'aprobado'
            `, [newTechnicianId, newStatus, incidentId]);

            if (result.affectedRows === 0) {
                throw new Error('No se pudo reasignar técnico.');
            }

            // Obtener información del nuevo técnico
            const [newTechUser] = await connection.query('SELECT full_name FROM users WHERE id = ?', [newTechnicianId]);
            const newTechName = newTechUser[0]?.full_name || 'Técnico';

            // Registrar en el historial
            const details = `Reasignado de "${incident.current_tech_name || 'Técnico anterior'}" a "${newTechName}"${reason ? `. Motivo: ${reason}` : ''}`;
            
            await connection.query(`
                INSERT INTO incident_history (incident_id, user_id, action, details) 
                VALUES (?, ?, 'Reasignación de técnico', ?)
            `, [incidentId, reassignedBy, details]);

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
                    w.anydesk_address,
                    w.advisor_cedula,
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

    static async getApprovedIncidentsForUser(userRole, userSede, userDepartamento = null, userId = null) {
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
                    w.anydesk_address,
                    w.advisor_cedula,
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
            } else if (userRole === 'jefe_operaciones') {
                // Jefes de operaciones ven incidencias de su sede y departamento
                query += ' AND w.sede = ? AND w.departamento = ?';
                params.push(userSede);
                params.push(userDepartamento);
            }
            
            // GARANTIZADO: Solo admins, técnicos, supervisores y jefes de operaciones pueden ver más incidencias
            // TODOS los demás (coordinadores, administrativos, etc.) solo ven SUS PROPIAS incidencias
            if (userRole !== 'admin' && userRole !== 'technician' && userRole !== 'supervisor' && userRole !== 'jefe_operaciones') {
                query += ' AND i.reported_by_id = ?';
                params.push(userId);
            }
            // Solo admin ve todo
            
            query += ' ORDER BY i.updated_at DESC';
            
            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getVisibleForUser(userRole, userSede, status = null, assignedTo = null, filters = {}, userDepartamento = null, userId = null) {
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
                    w.anydesk_address,
                    w.advisor_cedula,
                    reporter.full_name AS reported_by_name,
                    assigned.full_name AS assigned_to_name,
                    assigned.id AS assigned_to_id,
                    latest_reassign.timestamp as last_reassign_date,
                    CASE 
                        WHEN latest_reassign.timestamp IS NOT NULL 
                        AND latest_reassign.timestamp > DATE_SUB(NOW(), INTERVAL 48 HOUR)
                        THEN 1 
                        ELSE 0 
                    END as is_recently_reassigned
                FROM incidents i
                JOIN workstations w ON i.workstation_id = w.id
                JOIN users reporter ON i.reported_by_id = reporter.id
                LEFT JOIN users assigned ON i.assigned_to_id = assigned.id
                LEFT JOIN (
                    SELECT 
                        incident_id,
                        MAX(timestamp) as timestamp
                    FROM incident_history 
                    WHERE action = 'Reasignación de técnico'
                    GROUP BY incident_id
                ) latest_reassign ON i.id = latest_reassign.incident_id
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
            } else if (userRole === 'jefe_operaciones') {
                // Jefes de operaciones ven todas las incidencias de su departamento en su sede
                query += ' AND w.sede = ? AND w.departamento = ?';
                params.push(userSede);
                params.push(userDepartamento);
            }
            
            // GARANTIZADO: Solo roles administrativos específicos ven sus propias incidencias
            // Coordinadores y administrativos solo ven SUS PROPIAS incidencias
            // Jefes de operaciones ven TODAS las incidencias de su departamento/sede (pueden supervisar a coordinadores)
            if (userRole === 'coordinador' || userRole === 'administrativo') {
                query += ' AND i.reported_by_id = ?';
                params.push(userId);
            }
            // Solo admin ve todo
            
            // Lógica especial para incidencias en supervisión:
            // Admin y jefe_operaciones ven todas las incidencias en supervisión de su ámbito
            // Otros roles (coordinadores, administrativos, etc.) solo ven las que reportaron
            if (status === 'en_supervision' && userRole !== 'admin' && userRole !== 'jefe_operaciones') {
                query += ' AND i.status = ? AND i.reported_by_id = ?';
                params.push(status);
                params.push(userId);
            } else if (status) {
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

            // Filtro por rol del creador (para admin en vista de supervisión)
            if (filters.creador && userRole === 'admin') {
                query += ' AND reporter.role = ?';
                params.push(filters.creador);
            }

            // Filtro por tiempo en supervisión (para admin en vista de supervisión)
            if (filters.tiempo_supervision && userRole === 'admin') {
                const now = new Date();
                if (filters.tiempo_supervision === 'hoy') {
                    // Incidencias resueltas hoy
                    query += ' AND DATE(i.updated_at) = CURDATE()';
                } else if (filters.tiempo_supervision === '3dias') {
                    // Más de 3 días en supervisión
                    query += ' AND TIMESTAMPDIFF(HOUR, i.updated_at, NOW()) > 72';
                } else if (filters.tiempo_supervision === 'semana') {
                    // Más de 7 días en supervisión
                    query += ' AND TIMESTAMPDIFF(HOUR, i.updated_at, NOW()) > 168';
                } else if (filters.tiempo_supervision === 'mes') {
                    // Más de 30 días en supervisión
                    query += ' AND TIMESTAMPDIFF(HOUR, i.updated_at, NOW()) > 720';
                }
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