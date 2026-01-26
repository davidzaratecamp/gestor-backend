const db = require('../config/db');

class ActivoHistorial {
    /**
     * Registrar un cambio de componente en el historial
     * @param {number} activoId - ID del activo
     * @param {string} campo - Campo modificado (cpu_procesador, memoria_ram, almacenamiento, sistema_operativo)
     * @param {string|null} valorAnterior - Valor anterior del campo
     * @param {string} valorNuevo - Nuevo valor del campo
     * @param {number} usuarioId - ID del usuario que realizó el cambio
     */
    static async registrarCambio(activoId, campo, valorAnterior, valorNuevo, usuarioId) {
        try {
            const [result] = await db.query(`
                INSERT INTO activos_historial (activo_id, campo_modificado, valor_anterior, valor_nuevo, modificado_por_id)
                VALUES (?, ?, ?, ?, ?)
            `, [activoId, campo, valorAnterior, valorNuevo, usuarioId]);

            return { id: result.insertId, activoId, campo, valorAnterior, valorNuevo, usuarioId };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Obtener historial de cambios de un activo específico
     * @param {number} activoId - ID del activo
     */
    static async getByActivoId(activoId) {
        try {
            const [rows] = await db.query(`
                SELECT
                    ah.*,
                    u.full_name as modificado_por_nombre,
                    u.username as modificado_por_usuario
                FROM activos_historial ah
                LEFT JOIN users u ON ah.modificado_por_id = u.id
                WHERE ah.activo_id = ?
                ORDER BY ah.fecha_modificacion DESC
            `, [activoId]);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Obtener todo el historial de cambios (para admin/gestorActivos)
     * @param {number} limit - Límite de registros
     * @param {number} offset - Offset para paginación
     */
    static async getAll(limit = 100, offset = 0) {
        try {
            const [rows] = await db.query(`
                SELECT
                    ah.*,
                    a.numero_placa,
                    a.tipo_activo,
                    u.full_name as modificado_por_nombre,
                    u.username as modificado_por_usuario
                FROM activos_historial ah
                LEFT JOIN activos a ON ah.activo_id = a.id
                LEFT JOIN users u ON ah.modificado_por_id = u.id
                ORDER BY ah.fecha_modificacion DESC
                LIMIT ? OFFSET ?
            `, [limit, offset]);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Contar total de registros en el historial
     */
    static async countAll() {
        try {
            const [rows] = await db.query('SELECT COUNT(*) as total FROM activos_historial');
            return rows[0].total;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Obtener estadísticas del historial por usuario
     * @param {number} usuarioId - ID del usuario
     */
    static async getStatsByUser(usuarioId) {
        try {
            const [rows] = await db.query(`
                SELECT
                    COUNT(*) as total_cambios,
                    campo_modificado,
                    COUNT(*) as cambios_por_campo
                FROM activos_historial
                WHERE modificado_por_id = ?
                GROUP BY campo_modificado
            `, [usuarioId]);
            return rows;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = ActivoHistorial;
