const express = require('express');
const router = express.Router();
const userCompanyController = require('../controllers/userCompanyController');
const { verifyToken } = require('../middleware/auth');

const verificarGestorActivos = (req, res, next) => {
    if (!['gestorActivos', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Acceso denegado. Solo los gestores de activos pueden acceder a esta funcionalidad.'
        });
    }
    next();
};

router.use(verifyToken);
router.use(verificarGestorActivos);

router.get('/',                          userCompanyController.getAll);
router.get('/catalogos',                 userCompanyController.getCatalogos);
router.get('/gasto-total',               userCompanyController.getGastoTotal);
router.get('/:id',                       userCompanyController.getById);
router.get('/:id/activos',               userCompanyController.getActivos);
router.post('/',                         userCompanyController.create);
router.put('/:id',                       userCompanyController.update);
router.put('/:id/activos/:activoId',     userCompanyController.assignActivo);
router.delete('/:id',                    userCompanyController.delete);
router.delete('/:id/activos/:activoId',  userCompanyController.unassignActivo);

module.exports = router;
