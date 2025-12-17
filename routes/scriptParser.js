const express = require('express');
const router = express.Router();
const scriptParserController = require('../controllers/scriptParserController');

// Endpoint para recibir el texto completo del script
// POST /api/script-parser/parse - Parsear texto del script y crear/preview activo
router.post('/parse', scriptParserController.parseScriptText);

module.exports = router;