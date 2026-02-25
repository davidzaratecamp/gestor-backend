const express = require('express');
const router = express.Router();
const {
    getOverview,
    getIncidentsBySede,
    getIncidentsByDepartment,
    getIncidentsByFailureType,
    getTemporalTrend,
    getTopFailingStations,
    getTechnicianPerformance,
    getReportsByUser,
    getHourlyDistribution,
    getWeekdayDistribution,
    getResolutionTimeAnalysis,
    getQualityMetrics,
    getTechnicianDailyStats,
    getTechnicianDailyIncidents
} = require('../controllers/analyticsController');

const { verifyToken, isAdmin } = require('../middleware/auth');

// Todas las rutas requieren autenticación y permisos de admin
router.use(verifyToken);
router.use(isAdmin);

// @route   GET /api/analytics/overview
// @desc    Obtener resumen general de analíticas
// @access  Private (Admin)
router.get('/overview', getOverview);

// @route   GET /api/analytics/by-sede
// @desc    Obtener incidencias por sede
// @access  Private (Admin)
router.get('/by-sede', getIncidentsBySede);

// @route   GET /api/analytics/by-department
// @desc    Obtener incidencias por departamento
// @access  Private (Admin)
router.get('/by-department', getIncidentsByDepartment);

// @route   GET /api/analytics/by-failure-type
// @desc    Obtener incidencias por tipo de falla
// @access  Private (Admin)
router.get('/by-failure-type', getIncidentsByFailureType);

// @route   GET /api/analytics/temporal-trend
// @desc    Obtener tendencia temporal de incidencias
// @access  Private (Admin)
router.get('/temporal-trend', getTemporalTrend);

// @route   GET /api/analytics/top-failing-stations
// @desc    Obtener estaciones que más fallan
// @access  Private (Admin)
router.get('/top-failing-stations', getTopFailingStations);

// @route   GET /api/analytics/technician-performance
// @desc    Obtener rendimiento de técnicos
// @access  Private (Admin)
router.get('/technician-performance', getTechnicianPerformance);

// @route   GET /api/analytics/reports-by-user
// @desc    Obtener distribución de reportes por usuario
// @access  Private (Admin)
router.get('/reports-by-user', getReportsByUser);

// @route   GET /api/analytics/hourly-distribution
// @desc    Obtener distribución temporal por hora del día
// @access  Private (Admin)
router.get('/hourly-distribution', getHourlyDistribution);

// @route   GET /api/analytics/weekday-distribution
// @desc    Obtener distribución por día de la semana
// @access  Private (Admin)
router.get('/weekday-distribution', getWeekdayDistribution);

// @route   GET /api/analytics/resolution-time-analysis
// @desc    Obtener análisis de tiempo de resolución
// @access  Private (Admin)
router.get('/resolution-time-analysis', getResolutionTimeAnalysis);

// @route   GET /api/analytics/quality-metrics
// @desc    Obtener métricas avanzadas de calidad
// @access  Private (Admin)
router.get('/quality-metrics', getQualityMetrics);

// @route   GET /api/analytics/technician/:id/daily-stats
// @desc    Obtener estadísticas diarias de un técnico
// @access  Private (Admin)
router.get('/technician/:id/daily-stats', getTechnicianDailyStats);

// @route   GET /api/analytics/technician/:id/daily-incidents
// @desc    Obtener incidencias diarias de un técnico
// @access  Private (Admin)
router.get('/technician/:id/daily-incidents', getTechnicianDailyIncidents);

module.exports = router;