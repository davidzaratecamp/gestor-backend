const db = require('../config/db');

const SELECT_VACACIONES = `
    SELECT
        v.*,
        uc.id AS empleado_id,
        CONCAT_WS(' ', uc.primer_nombre, uc.segundo_nombre, uc.primer_apellido, uc.segundo_apellido) AS empleado_nombre,
        uc.numero_identificacion AS empleado_identificacion,
        car.nombre AS cargo_nombre,
        cam.nombre AS campania_nombre,
        cc.nombre AS centro_costo_nombre,
        (SELECT COUNT(*) FROM periodo_vacacional pv WHERE pv.vacaciones_idvacaciones = v.idvacaciones) AS total_periodos
    FROM vacaciones v
    JOIN contrato c ON v.contrato_idcontrato = c.idcontrato
    JOIN users_company uc ON c.users_company_id = uc.id
    LEFT JOIN cargo car ON c.cargo_idcargo = car.idcargo
    LEFT JOIN campania cam ON c.campania_idcampania = cam.idcampania
    LEFT JOIN centro_costo cc ON c.centro_costo_idcentro_costo = cc.idcentro_costo
`;

function val(x) {
    return x === undefined || x === null || x === '' ? null : x;
}

async function reemplazarPeriodos(conn, vacacionesId, periodos) {
    await conn.query('DELETE FROM periodo_vacacional WHERE vacaciones_idvacaciones = ?', [vacacionesId]);

    for (const periodo of (periodos || [])) {
        if (!periodo.fecha_inicio) continue;
        await conn.query(
            `INSERT INTO periodo_vacacional (vacaciones_idvacaciones, periodo_tomado, fecha_inicio, fecha_final)
             VALUES (?, ?, ?, ?)`,
            [vacacionesId, val(periodo.periodo_tomado), periodo.fecha_inicio, val(periodo.fecha_final)]
        );
    }
}

class Vacaciones {
    static async getAll(filters = {}) {
        const where = [];
        const params = [];

        if (filters.contrato_id) {
            where.push('v.contrato_idcontrato = ?');
            params.push(filters.contrato_id);
        }

        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const [rows] = await db.query(
            `${SELECT_VACACIONES} ${whereSql} ORDER BY v.fecha_corte DESC`,
            params
        );
        return rows;
    }

    static async getById(id) {
        const [rows] = await db.query(`${SELECT_VACACIONES} WHERE v.idvacaciones = ?`, [id]);
        const vacaciones = rows[0];
        if (!vacaciones) return null;

        const [periodos] = await db.query(
            'SELECT * FROM periodo_vacacional WHERE vacaciones_idvacaciones = ? ORDER BY fecha_inicio DESC',
            [id]
        );
        return { ...vacaciones, periodos };
    }

    static async create(data) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            const [result] = await conn.query(
                `INSERT INTO vacaciones (
                    contrato_idcontrato, fecha_corte, dias_trabajados, dias_acumulados,
                    dias_tomados, dias_compensados, pasivo_vacacional
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    data.contrato_id, data.fecha_corte, data.dias_trabajados ?? 0,
                    data.dias_acumulados ?? 0, data.dias_tomados ?? 0,
                    data.dias_compensados ?? 0, val(data.pasivo_vacacional)
                ]
            );
            const vacacionesId = result.insertId;

            await reemplazarPeriodos(conn, vacacionesId, data.periodos);

            await conn.commit();
            return { id: vacacionesId, ...data };
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    static async update(id, data) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            const [result] = await conn.query(
                `UPDATE vacaciones SET
                    contrato_idcontrato = ?, fecha_corte = ?, dias_trabajados = ?, dias_acumulados = ?,
                    dias_tomados = ?, dias_compensados = ?, pasivo_vacacional = ?,
                    updated_at = CURRENT_TIMESTAMP
                 WHERE idvacaciones = ?`,
                [
                    data.contrato_id, data.fecha_corte, data.dias_trabajados ?? 0,
                    data.dias_acumulados ?? 0, data.dias_tomados ?? 0,
                    data.dias_compensados ?? 0, val(data.pasivo_vacacional),
                    id
                ]
            );

            await reemplazarPeriodos(conn, id, data.periodos);

            await conn.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    static async delete(id) {
        // periodo_vacacional cae por ON DELETE CASCADE
        const [result] = await db.query('DELETE FROM vacaciones WHERE idvacaciones = ?', [id]);
        return result.affectedRows > 0;
    }
}

module.exports = Vacaciones;
