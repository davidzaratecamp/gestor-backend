const db = require('../config/db');

const SELECT_NOVEDAD = `
    SELECT
        nr.*,
        tn.nombre AS tipo_novedad_nombre,
        tn.categoria AS tipo_novedad_categoria,
        uc.id AS empleado_id,
        CONCAT_WS(' ', uc.primer_nombre, uc.segundo_nombre, uc.primer_apellido, uc.segundo_apellido) AS empleado_nombre,
        uc.numero_identificacion AS empleado_identificacion,
        car.nombre AS cargo_nombre,
        cam.nombre AS campania_nombre,
        cc.nombre AS centro_costo_nombre,
        CONCAT_WS(' ', resp.primer_nombre, resp.segundo_nombre, resp.primer_apellido, resp.segundo_apellido) AS responsable_nombre
    FROM novedad_rrhh nr
    JOIN contrato c ON nr.contrato_idcontrato = c.idcontrato
    JOIN users_company uc ON c.users_company_id = uc.id
    JOIN tipo_novedad tn ON nr.tipo_novedad_idtipo_novedad = tn.idtipo_novedad
    LEFT JOIN cargo car ON c.cargo_idcargo = car.idcargo
    LEFT JOIN campania cam ON c.campania_idcampania = cam.idcampania
    LEFT JOIN centro_costo cc ON c.centro_costo_idcentro_costo = cc.idcentro_costo
    LEFT JOIN users_company resp ON nr.responsable_id = resp.id
`;

function val(x) {
    return x === undefined || x === null || x === '' ? null : x;
}

class NovedadRrhh {
    static async getAll(filters = {}) {
        const where = [];
        const params = [];

        if (filters.contrato_id) {
            where.push('nr.contrato_idcontrato = ?');
            params.push(filters.contrato_id);
        }
        if (filters.tipo_novedad_id) {
            where.push('nr.tipo_novedad_idtipo_novedad = ?');
            params.push(filters.tipo_novedad_id);
        }
        if (filters.desde) {
            where.push('nr.fecha_inicial >= ?');
            params.push(filters.desde);
        }
        if (filters.hasta) {
            where.push('nr.fecha_inicial <= ?');
            params.push(filters.hasta);
        }

        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const [rows] = await db.query(
            `${SELECT_NOVEDAD} ${whereSql} ORDER BY nr.fecha_inicial DESC`,
            params
        );
        return rows;
    }

    static async getById(id) {
        const [rows] = await db.query(`${SELECT_NOVEDAD} WHERE nr.idnovedad_rrhh = ?`, [id]);
        return rows[0];
    }

    static async create(data) {
        const [result] = await db.query(
            `INSERT INTO novedad_rrhh (
                accidente_transito, fecha_inicial, fecha_final, fecha_retorno, total_dias,
                resumen_diagnostico, origen_incapacidad, observaciones, fecha_recibido, fecha_reporte,
                tiene_documento_original, tiene_copia_documento, tiene_historia_clinica,
                tiene_runt, tiene_furips, tiene_soat,
                tipo_novedad_idtipo_novedad, contrato_idcontrato, responsable_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.accidente_transito ? 1 : 0, data.fecha_inicial, val(data.fecha_final),
                val(data.fecha_retorno), val(data.total_dias),
                val(data.resumen_diagnostico), val(data.origen_incapacidad), val(data.observaciones),
                val(data.fecha_recibido), val(data.fecha_reporte),
                data.tiene_documento_original ? 1 : 0, data.tiene_copia_documento ? 1 : 0,
                data.tiene_historia_clinica ? 1 : 0, data.tiene_runt ? 1 : 0,
                data.tiene_furips ? 1 : 0, data.tiene_soat ? 1 : 0,
                data.tipo_novedad_id, data.contrato_id, val(data.responsable_id)
            ]
        );
        return { id: result.insertId, ...data };
    }

    static async update(id, data) {
        const [result] = await db.query(
            `UPDATE novedad_rrhh SET
                accidente_transito = ?, fecha_inicial = ?, fecha_final = ?, fecha_retorno = ?, total_dias = ?,
                resumen_diagnostico = ?, origen_incapacidad = ?, observaciones = ?, fecha_recibido = ?, fecha_reporte = ?,
                tiene_documento_original = ?, tiene_copia_documento = ?, tiene_historia_clinica = ?,
                tiene_runt = ?, tiene_furips = ?, tiene_soat = ?,
                tipo_novedad_idtipo_novedad = ?, contrato_idcontrato = ?, responsable_id = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE idnovedad_rrhh = ?`,
            [
                data.accidente_transito ? 1 : 0, data.fecha_inicial, val(data.fecha_final),
                val(data.fecha_retorno), val(data.total_dias),
                val(data.resumen_diagnostico), val(data.origen_incapacidad), val(data.observaciones),
                val(data.fecha_recibido), val(data.fecha_reporte),
                data.tiene_documento_original ? 1 : 0, data.tiene_copia_documento ? 1 : 0,
                data.tiene_historia_clinica ? 1 : 0, data.tiene_runt ? 1 : 0,
                data.tiene_furips ? 1 : 0, data.tiene_soat ? 1 : 0,
                data.tipo_novedad_id, data.contrato_id, val(data.responsable_id),
                id
            ]
        );
        return result.affectedRows > 0;
    }

    static async delete(id) {
        const [result] = await db.query('DELETE FROM novedad_rrhh WHERE idnovedad_rrhh = ?', [id]);
        return result.affectedRows > 0;
    }
}

module.exports = NovedadRrhh;
