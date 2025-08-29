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
    assignTechnician,
    markAsResolved,
    approveIncident,
    rejectIncident
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
    canViewIncidents
} = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas específicas por rol (deben ir antes de las rutas con parámetros)
router.get('/my-incidents', isTechnician, getMyIncidents);
router.get('/pending', verifyRole(['admin', 'technician', 'jefe_operaciones']), getPendingIncidents);
router.get('/supervision', canViewIncidents, getIncidentsInSupervision);
router.get('/approved', getApprovedIncidents);

// Rutas de estadísticas (solo para admin)
router.get('/stats/by-sede', verifyRole(['admin']), getStatsBySede);
router.get('/stats/technicians', verifyRole(['admin']), getTechniciansStatus);
router.get('/stats/technicians-ranking', verifyRole(['admin']), getTechniciansRanking);

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

// Crear nueva incidencia con archivos adjuntos (solo coordinadores)
router.post('/with-files', isCoordinador, upload.array('attachments', 5), createIncidentWithFiles);

// Asignar técnico (admin o técnico para auto-asignarse)
router.put('/:id/assign', isAdminOrTechnician, assignTechnician);

// Marcar como resuelto (técnico)
router.put('/:id/resolve', isTechnician, markAsResolved);

// Aprobar/rechazar incidencia (supervisor, coordinador, jefe_operaciones o admin)
router.put('/:id/approve', canSuperviseIncidents, approveIncident);
router.put('/:id/reject', canSuperviseIncidents, rejectIncident);

module.exports = router;