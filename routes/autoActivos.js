const express = require('express');
const router = express.Router();
const autoActivoController = require('../controllers/autoActivoController');

// Endpoint para recibir datos automáticos del equipo
// POST /api/auto-activos/create - Crear activo automáticamente
router.post('/create', autoActivoController.receiveEquipmentData);

// POST /api/auto-activos/preview - Solo preview de los datos (para testing)
router.post('/preview', autoActivoController.previewEquipmentData);

module.exports = router;