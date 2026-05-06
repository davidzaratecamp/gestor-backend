const express = require('express');
const router = express.Router();
const inventarioDirectivoController = require('../controllers/inventarioDirectivoController');
const { verifyToken } = require('../middleware/auth');

const verificarDirectivoFinanciero = (req, res, next) => {
    if (!['directivoFinanciero', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Acceso denegado. Solo directivos financieros pueden acceder a esta sección.'
        });
    }
    next();
};

router.use(verifyToken);
router.use(verificarDirectivoFinanciero);

// GET /api/inventario-directivo - Todos los activos (con filtros)
router.get('/', inventarioDirectivoController.getActivos);

// GET /api/inventario-directivo/stats - Estadísticas globales
router.get('/stats', inventarioDirectivoController.getStats);

// GET /api/inventario-directivo/charts - Datos para gráficos
router.get('/charts', inventarioDirectivoController.getChartData);

// GET /api/inventario-directivo/:id - Detalle de un activo
router.get('/:id', inventarioDirectivoController.getActivoById);

module.exports = router;
