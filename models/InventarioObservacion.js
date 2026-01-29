const db = require('../config/db');

class InventarioObservacion {
    /**
     * Crear una observación de inventario
     * @param {number} activoId - ID del activo
     * @param {string} observaciones - Texto de observaciones
     * @param {number} usuarioId - ID del usuario que realiza el inventario
     */
    static async crear(activoId, observaciones, usuarioId) {
        try {
            const [result] = await db.query(`
                INSERT INTO inventario_observaciones (activo_id, observaciones, realizado_por_id)
                VALUES (?, ?, ?)
            `, [activoId, observaciones, usuarioId]);

            return { id: result.insertId, activoId, observaciones, usuarioId };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Obtener observaciones de inventario de un activo
     * @param {number} activoId - ID del activo
     */
    static async getByActivoId(activoId) {
        try {
            const [rows] = await db.query(`
                SELECT
                    io.*,
                    u.full_name as realizado_por_nombre,
                    u.username as realizado_por_usuario
                FROM inventario_observaciones io
                LEFT JOIN users u ON io.realizado_por_id = u.id
                WHERE io.activo_id = ?
                ORDER BY io.fecha_creacion DESC
            `, [activoId]);
            return rows;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = InventarioObservacion;
