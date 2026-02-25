const db = require('../config/db');

// @desc    Obtener resumen general de analíticas
// @route   GET /api/analytics/overview
// @access  Private (Admin)
exports.getOverview = async (req, res) => {
    try {
        const [overview] = await db.execute(`
            SELECT 
                COUNT(*) as total_incidents,
                COUNT(CASE WHEN status = 'pendiente' THEN 1 END) as pending_incidents,
                COUNT(CASE WHEN status = 'en_proceso' THEN 1 END) as in_process_incidents,
                COUNT(CASE WHEN status = 'en_supervision' THEN 1 END) as in_supervision_incidents,
                COUNT(CASE WHEN status = 'aprobado' THEN 1 END) as approved_incidents,
                COUNT(DISTINCT workstation_id) as total_workstations,
                COUNT(DISTINCT reported_by_id) as total_reporters,
                COUNT(DISTINCT assigned_to_id) as total_technicians,
                AVG(TIMESTAMPDIFF(HOUR, created_at, 
                    CASE WHEN status = 'aprobado' THEN updated_at ELSE NULL END
                )) as avg_resolution_time_hours
            FROM incidents
        `);

        res.json(overview[0]);
    } catch (error) {
        console.error('Error en getOverview:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
};

// @desc    Obtener incidencias por sede
// @route   GET /api/analytics/by-sede
// @access  Private (Admin)
exports.getIncidentsBySede = async (req, res) => {
    try {
        console.log('getIncidentsBySede called');
        
        // Primero obtenemos todas las sedes disponibles
        const [allSedes] = await db.execute(`
            SELECT DISTINCT sede FROM workstations 
            WHERE sede IN ('bogota', 'barranquilla', 'villavicencio')
            ORDER BY sede
        `);
        
        // Luego obtenemos las estadísticas de incidencias por sede
        const [incidentStats] = await db.execute(`
            SELECT 
                w.sede,
                COUNT(i.id) as total,
                COUNT(CASE WHEN i.status = 'pendiente' THEN 1 END) as pendiente,
                COUNT(CASE WHEN i.status = 'en_proceso' THEN 1 END) as en_proceso,
                COUNT(CASE WHEN i.status = 'en_supervision' THEN 1 END) as en_supervision,
                COUNT(CASE WHEN i.status = 'aprobado' THEN 1 END) as aprobado
            FROM workstations w
            LEFT JOIN incidents i ON w.id = i.workstation_id
            WHERE w.sede IN ('bogota', 'barranquilla', 'villavicencio')
            GROUP BY w.sede
            ORDER BY total DESC
        `);
        
        // Crear un mapa de estadísticas por sede
        const statsMap = {};
        incidentStats.forEach(stat => {
            statsMap[stat.sede] = stat;
        });
        
        // Asegurar que todas las sedes aparezcan, incluso con 0 incidencias
        const sedes = ['bogota', 'barranquilla', 'villavicencio'];
        const results = sedes.map(sede => {
            return statsMap[sede] || {
                sede: sede,
                total: 0,
                pendiente: 0,
                en_proceso: 0,
                en_supervision: 0,
                aprobado: 0
            };
        });
        
        console.log('getIncidentsBySede results:', results);
        res.json(results);
    } catch (error) {
        console.error('Error en getIncidentsBySede:', error);
        console.error('Error details:', error.message);
        res.status(500).json({ msg: 'Error del servidor', error: error.message });
    }
};

// @desc    Obtener incidencias por departamento
// @route   GET /api/analytics/by-department
// @access  Private (Admin)
exports.getIncidentsByDepartment = async (req, res) => {
    try {
        const [results] = await db.execute(`
            SELECT 
                w.departamento,
                w.sede,
                COUNT(*) as total,
                COUNT(CASE WHEN i.status = 'pendiente' THEN 1 END) as pendiente,
                COUNT(CASE WHEN i.status = 'en_proceso' THEN 1 END) as en_proceso,
                COUNT(CASE WHEN i.status = 'en_supervision' THEN 1 END) as en_supervision,
                COUNT(CASE WHEN i.status = 'aprobado' THEN 1 END) as aprobado
            FROM incidents i
            JOIN workstations w ON i.workstation_id = w.id
            GROUP BY w.departamento, w.sede
            ORDER BY total DESC
        `);

        res.json(results);
    } catch (error) {
        console.error('Error en getIncidentsByDepartment:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
};

// @desc    Obtener incidencias por tipo de falla
// @route   GET /api/analytics/by-failure-type
// @access  Private (Admin)
exports.getIncidentsByFailureType = async (req, res) => {
    try {
        const [results] = await db.execute(`
            SELECT 
                failure_type,
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'aprobado' THEN 1 END) as resolved,
                AVG(TIMESTAMPDIFF(HOUR, created_at, 
                    CASE WHEN status = 'aprobado' THEN updated_at ELSE NULL END
                )) as avg_resolution_time_hours
            FROM incidents
            GROUP BY failure_type
            ORDER BY total DESC
        `);

        res.json(results);
    } catch (error) {
        console.error('Error en getIncidentsByFailureType:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
};

// @desc    Obtener tendencia temporal de incidencias
// @route   GET /api/analytics/temporal-trend
// @access  Private (Admin)
exports.getTemporalTrend = async (req, res) => {
    try {
        const { period = '30' } = req.query; // días por defecto
        const periodValue = Math.max(1, Math.min(365, parseInt(period) || 30)); // Entre 1 y 365 días
        
        console.log('getTemporalTrend called with period:', period, 'parsed as:', periodValue);
        
        const [results] = await db.execute(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'aprobado' THEN 1 END) as resolved
            FROM incidents
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${periodValue} DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);

        console.log('getTemporalTrend query executed successfully, results count:', results.length);
        res.json(results);
    } catch (error) {
        console.error('Error en getTemporalTrend:', error);
        console.error('Error details:', error.message);
        res.status(500).json({ msg: 'Error del servidor', error: error.message });
    }
};

// @desc    Obtener estaciones que más fallan
// @route   GET /api/analytics/top-failing-stations
// @access  Private (Admin)
exports.getTopFailingStations = async (req, res) => {
    try {
        const { limit = '10' } = req.query;
        const limitValue = Math.max(1, Math.min(100, parseInt(limit) || 10)); // Entre 1 y 100
        
        console.log('getTopFailingStations called with limit:', limit, 'parsed as:', limitValue);
        
        // Usar query string directamente sin parámetros preparados para LIMIT
        const [results] = await db.execute(`
            SELECT 
                w.station_code,
                w.sede,
                w.departamento,
                COALESCE(w.location_details, '') as location_details,
                COUNT(i.id) as total_incidents,
                COUNT(CASE WHEN i.status = 'pendiente' THEN 1 END) as pending,
                COUNT(CASE WHEN i.status = 'aprobado' THEN 1 END) as resolved,
                COALESCE(AVG(CASE 
                    WHEN i.status = 'aprobado' 
                    THEN TIMESTAMPDIFF(HOUR, i.created_at, i.updated_at) 
                    ELSE NULL 
                END), 0) as avg_resolution_time_hours,
                MAX(i.created_at) as last_incident_date
            FROM workstations w
            INNER JOIN incidents i ON w.id = i.workstation_id
            GROUP BY w.id, w.station_code, w.sede, w.departamento, w.location_details
            ORDER BY total_incidents DESC
            LIMIT ${limitValue}
        `);

        console.log('Query executed successfully, results count:', results.length);
        res.json(results);
    } catch (error) {
        console.error('Error en getTopFailingStations:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({ msg: 'Error del servidor', error: error.message });
    }
};

// @desc    Obtener rendimiento de técnicos
// @route   GET /api/analytics/technician-performance
// @access  Private (Admin)
exports.getTechnicianPerformance = async (req, res) => {
    try {
        console.log('getTechnicianPerformance called');
        
        const [results] = await db.execute(`
            SELECT 
                u.id,
                u.full_name,
                COALESCE(u.sede, '') as sede,
                COALESCE(u.departamento, '') as departamento,
                COALESCE(incidents_stats.total_assigned, 0) as total_assigned,
                COALESCE(incidents_stats.total_resolved, 0) as total_resolved,
                COALESCE(incidents_stats.currently_working, 0) as currently_working,
                COALESCE(incidents_stats.avg_resolution_time_hours, 0) as avg_resolution_time_hours,
                COALESCE(ratings_stats.avg_rating, 0) as avg_rating,
                COALESCE(ratings_stats.total_ratings, 0) as total_ratings
            FROM users u
            LEFT JOIN (
                SELECT 
                    assigned_to_id,
                    COUNT(*) as total_assigned,
                    COUNT(CASE WHEN status = 'aprobado' THEN 1 END) as total_resolved,
                    COUNT(CASE WHEN status = 'en_proceso' THEN 1 END) as currently_working,
                    ROUND(AVG(
                        CASE WHEN resolution_time.time_hours IS NOT NULL 
                        THEN resolution_time.time_hours 
                        ELSE NULL END
                    ), 1) as avg_resolution_time_hours
                FROM incidents i
                LEFT JOIN (
                    SELECT 
                        assigned_hist.incident_id,
                        TIMESTAMPDIFF(MINUTE, assigned_hist.timestamp, resolved_hist.timestamp) / 60.0 as time_hours
                    FROM incident_history assigned_hist
                    JOIN incident_history resolved_hist ON assigned_hist.incident_id = resolved_hist.incident_id
                    WHERE assigned_hist.action = 'Asignación de técnico'
                    AND resolved_hist.action = 'Marcado como resuelto'
                    AND resolved_hist.timestamp > assigned_hist.timestamp
                ) resolution_time ON i.id = resolution_time.incident_id
                WHERE i.assigned_to_id IS NOT NULL
                GROUP BY i.assigned_to_id
            ) incidents_stats ON u.id = incidents_stats.assigned_to_id
            LEFT JOIN (
                SELECT 
                    technician_id,
                    AVG(rating) as avg_rating,
                    COUNT(*) as total_ratings
                FROM technician_ratings
                GROUP BY technician_id
            ) ratings_stats ON u.id = ratings_stats.technician_id
            WHERE u.role = 'technician'
            ORDER BY total_resolved DESC, avg_rating DESC
        `);

        console.log('getTechnicianPerformance query executed successfully, results count:', results.length);
        res.json(results);
    } catch (error) {
        console.error('Error en getTechnicianPerformance:', error);
        console.error('Error details:', error.message);
        res.status(500).json({ msg: 'Error del servidor', error: error.message });
    }
};

// @desc    Obtener distribución de reportes por usuario
// @route   GET /api/analytics/reports-by-user
// @access  Private (Admin)
exports.getReportsByUser = async (req, res) => {
    try {
        console.log('getReportsByUser called');
        
        const [results] = await db.execute(`
            SELECT 
                u.full_name,
                u.role,
                COALESCE(u.sede, '') as sede,
                COALESCE(u.departamento, '') as departamento,
                COUNT(i.id) as total_reports,
                COUNT(CASE WHEN i.status = 'pendiente' THEN 1 END) as pending_reports,
                COUNT(CASE WHEN i.status = 'aprobado' THEN 1 END) as resolved_reports,
                COALESCE(AVG(CASE 
                    WHEN i.status = 'aprobado' 
                    THEN TIMESTAMPDIFF(HOUR, i.created_at, i.updated_at) 
                    ELSE NULL 
                END), 0) as avg_resolution_time_hours
            FROM users u
            INNER JOIN incidents i ON u.id = i.reported_by_id
            WHERE u.role != 'anonimo'
            GROUP BY u.id, u.full_name, u.role, u.sede, u.departamento
            ORDER BY total_reports DESC
        `);

        console.log('getReportsByUser query executed successfully, results count:', results.length);
        res.json(results);
    } catch (error) {
        console.error('Error en getReportsByUser:', error);
        console.error('Error details:', error.message);
        res.status(500).json({ msg: 'Error del servidor', error: error.message });
    }
};

// @desc    Obtener distribución temporal por hora del día
// @route   GET /api/analytics/hourly-distribution
// @access  Private (Admin)
exports.getHourlyDistribution = async (req, res) => {
    try {
        const [results] = await db.execute(`
            SELECT 
                HOUR(created_at) as hour,
                COUNT(*) as total_incidents
            FROM incidents
            GROUP BY HOUR(created_at)
            ORDER BY hour ASC
        `);

        res.json(results);
    } catch (error) {
        console.error('Error en getHourlyDistribution:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
};

// @desc    Obtener distribución por día de la semana
// @route   GET /api/analytics/weekday-distribution
// @access  Private (Admin)
exports.getWeekdayDistribution = async (req, res) => {
    try {
        const [results] = await db.execute(`
            SELECT 
                DAYOFWEEK(created_at) as day_of_week,
                DAYNAME(created_at) as day_name,
                COUNT(*) as total_incidents
            FROM incidents
            GROUP BY DAYOFWEEK(created_at), DAYNAME(created_at)
            ORDER BY day_of_week ASC
        `);

        res.json(results);
    } catch (error) {
        console.error('Error en getWeekdayDistribution:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
};

// @desc    Obtener análisis de tiempo de resolución
// @route   GET /api/analytics/resolution-time-analysis
// @access  Private (Admin)
exports.getResolutionTimeAnalysis = async (req, res) => {
    try {
        const [results] = await db.execute(`
            SELECT 
                w.sede,
                w.departamento,
                i.failure_type,
                COUNT(*) as total_resolved,
                AVG(TIMESTAMPDIFF(HOUR, i.created_at, i.updated_at)) as avg_hours,
                MIN(TIMESTAMPDIFF(HOUR, i.created_at, i.updated_at)) as min_hours,
                MAX(TIMESTAMPDIFF(HOUR, i.created_at, i.updated_at)) as max_hours,
                STDDEV(TIMESTAMPDIFF(HOUR, i.created_at, i.updated_at)) as stddev_hours
            FROM incidents i
            JOIN workstations w ON i.workstation_id = w.id
            WHERE i.status = 'aprobado'
            GROUP BY w.sede, w.departamento, i.failure_type
            HAVING total_resolved >= 3
            ORDER BY avg_hours DESC
        `);

        res.json(results);
    } catch (error) {
        console.error('Error en getResolutionTimeAnalysis:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
};

// @desc    Obtener estadísticas diarias de un técnico
// @route   GET /api/analytics/technician/:id/daily-stats
// @access  Private (Admin)
exports.getTechnicianDailyStats = async (req, res) => {
    try {
        const { id } = req.params;
        const technicianId = parseInt(id, 10);

        if (!technicianId || isNaN(technicianId)) {
            return res.status(400).json({ msg: 'ID de técnico inválido' });
        }

        // Default: mes actual
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const startDate = req.query.start_date || firstDay.toISOString().split('T')[0];
        const endDate = req.query.end_date || lastDay.toISOString().split('T')[0];

        const [results] = await db.execute(`
            SELECT
                DATE(ih.timestamp) as date,
                SUM(CASE WHEN ih.action = 'Asignación de técnico' THEN 1 ELSE 0 END) as assigned,
                SUM(CASE WHEN ih.action = 'Marcado como resuelto' THEN 1 ELSE 0 END) as resolved,
                SUM(CASE WHEN ih.action = 'Devuelto por técnico' THEN 1 ELSE 0 END) as returned
            FROM incident_history ih
            JOIN incidents i ON ih.incident_id = i.id
            WHERE i.assigned_to_id = ?
              AND ih.timestamp BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
            GROUP BY DATE(ih.timestamp)
            ORDER BY date ASC
        `, [technicianId, startDate, endDate]);

        res.json(results);
    } catch (error) {
        console.error('Error en getTechnicianDailyStats:', error);
        res.status(500).json({ msg: 'Error del servidor', error: error.message });
    }
};

// @desc    Obtener métricas avanzadas de calidad
// @route   GET /api/analytics/quality-metrics
// @access  Private (Admin)
exports.getQualityMetrics = async (req, res) => {
    try {
        // Primera consulta: métricas generales
        const [generalMetrics] = await db.execute(`
            SELECT 
                COUNT(*) as total_incidents,
                COUNT(CASE WHEN status = 'aprobado' THEN 1 END) as resolved_count,
                COUNT(CASE WHEN status = 'aprobado' THEN 1 END) / COUNT(*) * 100 as resolution_rate,
                AVG(CASE WHEN status = 'aprobado' 
                    THEN TIMESTAMPDIFF(HOUR, created_at, updated_at) 
                    ELSE NULL END) as avg_resolution_hours,
                COUNT(CASE WHEN TIMESTAMPDIFF(HOUR, created_at, NOW()) > 24 
                    AND status != 'aprobado' THEN 1 END) as overdue_incidents
            FROM incidents
        `);

        // Segunda consulta: distribución de calificaciones
        const [ratingDistribution] = await db.execute(`
            SELECT 
                rating,
                COUNT(*) as count
            FROM technician_ratings
            GROUP BY rating
            ORDER BY rating ASC
        `);

        // Tercera consulta: tiempo de respuesta por prioridad
        const [responseTimeByType] = await db.execute(`
            SELECT 
                failure_type,
                COUNT(*) as total,
                AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_response_hours
            FROM incidents
            WHERE status = 'aprobado'
            GROUP BY failure_type
            ORDER BY avg_response_hours DESC
        `);

        res.json({
            general: generalMetrics[0],
            ratings: ratingDistribution,
            responseTimeByType
        });
    } catch (error) {
        console.error('Error en getQualityMetrics:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
};