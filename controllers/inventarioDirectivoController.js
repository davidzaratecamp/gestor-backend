const Activo = require('../models/Activo');
const db = require('../config/db');

const inventarioDirectivoController = {
    async getActivos(req, res) {
        try {
            const filters = req.query;
            let activos;
            if (Object.keys(filters).length > 0) {
                activos = await Activo.getByFilter(filters);
            } else {
                activos = await Activo.getAll();
            }
            res.json({ activos });
        } catch (error) {
            console.error('Error al obtener activos:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
        }
    },

    async getActivoById(req, res) {
        try {
            const { id } = req.params;
            const activo = await Activo.getById(id);
            if (!activo) {
                return res.status(404).json({ success: false, message: 'Activo no encontrado' });
            }
            res.json({ activo });
        } catch (error) {
            console.error('Error al obtener activo:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
        }
    },

    async getStats(req, res) {
        try {
            const stats = await Activo.getStats();
            const [enMantenimiento] = await db.query("SELECT COUNT(*) as total FROM activos WHERE estado = 'en_mantenimiento'");
            const [enBodega] = await db.query("SELECT COUNT(*) as total FROM activos WHERE estado = 'bodega'");
            const [dadosDeBaja] = await db.query("SELECT COUNT(*) as total FROM activos WHERE estado = 'dado_de_baja'");
            const [funcionales] = await db.query("SELECT COUNT(*) as total FROM activos WHERE estado = 'funcional'");

            res.json({
                stats: {
                    ...stats,
                    en_mantenimiento: enMantenimiento[0].total,
                    en_bodega: enBodega[0].total,
                    dados_de_baja: dadosDeBaja[0].total,
                    funcionales: funcionales[0].total
                }
            });
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
        }
    },

    async getChartData(req, res) {
        try {
            const [porTipo] = await db.query(
                'SELECT tipo_activo, COUNT(*) as total FROM activos GROUP BY tipo_activo ORDER BY total DESC'
            );

            const [porUbicacion] = await db.query(
                'SELECT ubicacion, COUNT(*) as total FROM activos WHERE ubicacion IS NOT NULL GROUP BY ubicacion ORDER BY total DESC'
            );

            const [porUbicacionClasificacion] = await db.query(`
                SELECT ubicacion, clasificacion, COUNT(*) as total
                FROM activos
                WHERE ubicacion IS NOT NULL AND clasificacion IS NOT NULL
                GROUP BY ubicacion, clasificacion
                ORDER BY ubicacion, clasificacion
            `);

            const [porEstado] = await db.query(
                "SELECT COALESCE(estado, 'funcional') as estado, COUNT(*) as total FROM activos GROUP BY estado ORDER BY total DESC"
            );

            const [porProveedor] = await db.query(
                "SELECT proveedor, COUNT(*) as total FROM activos WHERE proveedor IS NOT NULL AND proveedor != '' GROUP BY proveedor ORDER BY total DESC LIMIT 8"
            );

            const [porMes] = await db.query(`
                SELECT DATE_FORMAT(fecha_compra, '%Y-%m') as mes, COUNT(*) as total
                FROM activos
                WHERE fecha_compra IS NOT NULL AND fecha_compra >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                GROUP BY mes
                ORDER BY mes ASC
            `);

            const [porClasificacion] = await db.query(
                'SELECT clasificacion, COUNT(*) as total FROM activos WHERE clasificacion IS NOT NULL GROUP BY clasificacion'
            );

            const [valorPorUbicacion] = await db.query(
                'SELECT ubicacion, COALESCE(ROUND(SUM(valor), 0), 0) as valor_total FROM activos WHERE ubicacion IS NOT NULL AND valor IS NOT NULL AND valor > 0 GROUP BY ubicacion ORDER BY valor_total DESC'
            );

            const [porSite] = await db.query(
                "SELECT site, COUNT(*) as total FROM activos WHERE site IS NOT NULL AND site != '' GROUP BY site ORDER BY total DESC"
            );

            res.json({
                porTipo,
                porUbicacion,
                porUbicacionClasificacion,
                porEstado,
                porProveedor,
                porMes,
                porClasificacion,
                valorPorUbicacion,
                porSite
            });
        } catch (error) {
            console.error('Error al obtener datos de gráficos:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
        }
    }
};

module.exports = inventarioDirectivoController;
