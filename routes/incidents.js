const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
    getAllIncidents,
    getMyIncidents,
    getPendingIncidents,
    getIncidentsInSupervision,
    getApprovedIncidents,
    getIncidentById,
    getIncidentHistory,
    createIncident,
    createIncidentWithFiles,
    getIncidentAttachments,
    getStatsBySede,
    getTechniciansStatus,
    getTechnicianRatings,
    getMyRatings,
    getTechniciansRanking,
    getCoordinatorsRanking,
    exportOldIncidents,
    assignTechnician,
    reassignTechnician,
    markAsResolved,
    approveIncident,
    rejectIncident,
    returnIncident,
    sendApprovalAlerts,
    getMyAlerts,
    markAlertAsRead,
    dismissAlert
} = require('../controllers/incidentController');
const { 
    verifyToken,
    verifyRole, 
    isAdmin, 
    isSupervisor, 
    isCoordinador,
    isJefeOperaciones,
    isTechnician, 
    isAdminOrSupervisor, 
    isAdminOrCoordinador,
    isAdminOrTechnician,
    canCreateIncidents,
    canSuperviseIncidents,
    canViewIncidents,
    canCreateIncidentsWithFiles
} = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas específicas por rol (deben ir antes de las rutas con parámetros)
router.get('/my-incidents', isTechnician, getMyIncidents);
router.get('/pending', verifyRole(['admin', 'technician', 'jefe_operaciones', 'administrativo']), getPendingIncidents);
router.get('/supervision', canViewIncidents, getIncidentsInSupervision);
router.get('/approved', getApprovedIncidents);

// Rutas de estadísticas (solo para admin)
router.get('/stats/by-sede', verifyRole(['admin']), getStatsBySede);
router.get('/stats/technicians', verifyRole(['admin']), getTechniciansStatus);
router.get('/stats/technicians-ranking', verifyRole(['admin']), getTechniciansRanking);
router.get('/stats/coordinators-ranking', verifyRole(['admin']), getCoordinatorsRanking);

// Rutas de exportación (solo para admin)
// Ruta de exportación con logging detallado
router.get('/export/old-incidents', (req, res, next) => {
    console.log('🔍 DEBUG - Export route called, user:', {
        id: req.user?.id,
        role: req.user?.role,
        fullName: req.user?.fullName
    });
    next();
}, verifyRole(['admin']), exportOldIncidents);

// Enviar alertas (solo para admin)
router.post('/send-alerts', isAdmin, sendApprovalAlerts);

// Rutas de alertas
router.get('/my-alerts', getMyAlerts);
router.put('/alerts/:id/read', markAlertAsRead);
router.put('/alerts/:id/dismiss', dismissAlert);

// Rutas de calificaciones
router.get('/my-ratings', isTechnician, getMyRatings);
router.get('/ratings/:technicianId', canViewIncidents, getTechnicianRatings);

// Ruta general (filtrable por query params)
router.get('/', getAllIncidents);

// Rutas con parámetros (deben ir al final)
router.get('/:id', getIncidentById);
router.get('/:id/history', getIncidentHistory);
router.get('/:id/attachments', getIncidentAttachments);

// Crear nueva incidencia (supervisor, coordinador o admin)
router.post('/', canCreateIncidents, createIncident);

// Crear nueva incidencia con archivos adjuntos (coordinadores y administrativos)
router.post('/with-files', canCreateIncidentsWithFiles, upload.array('attachments', 5), createIncidentWithFiles);

// Asignar técnico (admin o técnico para auto-asignarse)
router.put('/:id/assign', isAdminOrTechnician, assignTechnician);

// Reasignar técnico (solo admin)
router.put('/:id/reassign', isAdmin, reassignTechnician);

// Marcar como resuelto (técnico)
router.put('/:id/resolve', isTechnician, markAsResolved);

// Devolver incidencia al creador (técnico)
router.put('/:id/return', isTechnician, returnIncident);

// Aprobar/rechazar incidencia (supervisor, coordinador, administrativo o admin)
router.put('/:id/approve', canSuperviseIncidents, approveIncident);
router.put('/:id/reject', canSuperviseIncidents, rejectIncident);

module.exports = router;