const db = require('../config/db');

const SELECT_TRASPASO = `
    SELECT
        t.*,
        uc.id AS empleado_id,
        CONCAT_WS(' ', uc.primer_nombre, uc.segundo_nombre, uc.primer_apellido, uc.segundo_apellido) AS empleado_nombre,
        uc.numero_identificacion AS empleado_identificacion,
        aa.nombre AS area_anterior_nombre,
        an.nombre AS area_nueva_nombre,
        cama.nombre AS campania_anterior_nombre,
        camn.nombre AS campania_nueva_nombre,
        cca.nombre AS centro_costo_anterior_nombre,
        ccn.nombre AS centro_costo_nuevo_nombre,
        carga.nombre AS cargo_anterior_nombre,
        cargn.nombre AS cargo_nuevo_nombre,
        modal.nombre AS modalidad_nombre,
        CONCAT_WS(' ', jaa.primer_nombre, jaa.segundo_nombre, jaa.primer_apellido, jaa.segundo_apellido) AS jefe_area_anterior_nombre,
        CONCAT_WS(' ', jan.primer_nombre, jan.segundo_nombre, jan.primer_apellido, jan.segundo_apellido) AS jefe_area_nuevo_nombre,
        CONCAT_WS(' ', jia.primer_nombre, jia.segundo_nombre, jia.primer_apellido, jia.segundo_apellido) AS jefe_inmediato_anterior_nombre,
        CONCAT_WS(' ', jin.primer_nombre, jin.segundo_nombre, jin.primer_apellido, jin.segundo_apellido) AS jefe_inmediato_nuevo_nombre
    FROM traspaso t
    JOIN contrato c ON t.contrato_idcontrato = c.idcontrato
    JOIN users_company uc ON c.users_company_id = uc.id
    LEFT JOIN area aa ON t.area_anterior_id = aa.idarea
    LEFT JOIN area an ON t.area_nueva_id = an.idarea
    LEFT JOIN campania cama ON t.campania_anterior_id = cama.idcampania
    LEFT JOIN campania camn ON t.campania_nueva_id = camn.idcampania
    LEFT JOIN centro_costo cca ON t.centro_costo_anterior_id = cca.idcentro_costo
    LEFT JOIN centro_costo ccn ON t.centro_costo_nuevo_id = ccn.idcentro_costo
    LEFT JOIN cargo carga ON t.cargo_anterior_id = carga.idcargo
    LEFT JOIN cargo cargn ON t.cargo_nuevo_id = cargn.idcargo
    LEFT JOIN modalidad modal ON t.modalidad_idmodalidad = modal.idmodalidad
    LEFT JOIN users_company jaa ON t.jefe_area_anterior_id = jaa.id
    LEFT JOIN users_company jan ON t.jefe_area_nuevo_id = jan.id
    LEFT JOIN users_company jia ON t.jefe_inmediato_anterior_id = jia.id
    LEFT JOIN users_company jin ON t.jefe_inmediato_nuevo_id = jin.id
`;

function val(x) {
    return x === undefined || x === null || x === '' ? null : x;
}

// Mismo orden de columnas para INSERT y UPDATE (evita desalineación de '?')
const CAMPOS = [
    'contrato_idcontrato', 'estado', 'fecha_inicio', 'fecha_fin', 'ratificacion', 'observaciones',
    'area_anterior_id', 'campania_anterior_id', 'centro_costo_anterior_id', 'cargo_anterior_id',
    'cargo_ssff_anterior', 'usuario_ssff_anterior', 'salario_anterior',
    'bono_no_prestacional_anterior', 'bono_cafeteria_anterior',
    'jefe_area_anterior_id', 'jefe_inmediato_anterior_id',
    'area_nueva_id', 'campania_nueva_id', 'centro_costo_nuevo_id', 'cargo_nuevo_id',
    'cargo_ssff_nuevo', 'usuario_ssff_nuevo', 'salario_nuevo',
    'bono_no_prestacional_nuevo', 'bono_cafeteria_nuevo',
    'jefe_area_nuevo_id', 'jefe_inmediato_nuevo_id', 'modalidad_idmodalidad',
    'fecha_inicio_trabajo_casa', 'fecha_fin_trabajo_casa', 'diadema', 'equipo_computo'
];

function valoresDe(data) {
    return CAMPOS.map(campo => {
        if (campo === 'contrato_idcontrato') return data.contrato_id;
        if (campo === 'fecha_inicio') return data.fecha_inicio;
        if (campo === 'ratificacion') return data.ratificacion ? 1 : 0;
        return val(data[campo]);
    });
}

class Traspaso {
    static async getAll(filters = {}) {
        const where = [];
        const params = [];

        if (filters.contrato_id) {
            where.push('t.contrato_idcontrato = ?');
            params.push(filters.contrato_id);
        }
        if (filters.desde) {
            where.push('t.fecha_inicio >= ?');
            params.push(filters.desde);
        }
        if (filters.hasta) {
            where.push('t.fecha_inicio <= ?');
            params.push(filters.hasta);
        }

        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const [rows] = await db.query(
            `${SELECT_TRASPASO} ${whereSql} ORDER BY t.fecha_inicio DESC`,
            params
        );
        return rows;
    }

    static async getById(id) {
        const [rows] = await db.query(`${SELECT_TRASPASO} WHERE t.idtraspaso = ?`, [id]);
        return rows[0];
    }

    static async create(data) {
        const [result] = await db.query(
            `INSERT INTO traspaso (${CAMPOS.join(', ')}) VALUES (${CAMPOS.map(() => '?').join(', ')})`,
            valoresDe(data)
        );
        return { id: result.insertId, ...data };
    }

    static async update(id, data) {
        const sets = CAMPOS.map(campo => `${campo} = ?`).join(', ');
        const [result] = await db.query(
            `UPDATE traspaso SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE idtraspaso = ?`,
            [...valoresDe(data), id]
        );
        return result.affectedRows > 0;
    }

    static async delete(id) {
        const [result] = await db.query('DELETE FROM traspaso WHERE idtraspaso = ?', [id]);
        return result.affectedRows > 0;
    }
}

module.exports = Traspaso;
