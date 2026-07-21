const db = require('../config/db');

const SELECT_EMPLEADO = `
    SELECT
        uc.*,
        ti.nombre AS tipo_identificacion_nombre,
        ti.codigo AS tipo_identificacion_codigo,
        ec.nombre AS estado_civil_nombre,
        gs.nombre AS grupo_sanguineo_nombre,
        g.nombre  AS genero_nombre,
        cn.nombre AS ciudad_nacimiento_nombre,
        cex.nombre AS ciudad_expedicion_nombre,
        CONCAT_WS(' ', uc.primer_nombre, uc.segundo_nombre, uc.primer_apellido, uc.segundo_apellido) AS nombre_completo,
        (SELECT COUNT(*) FROM activos a WHERE a.agente_id = uc.id) AS total_activos,
        c.idcontrato,
        c.fecha_ingreso,
        cam.nombre  AS campania_nombre,
        car.nombre  AS cargo_nombre,
        ar.nombre   AS area_nombre,
        tc.nombre   AS tipo_contrato_nombre,
        esc.nombre  AS estado_contrato_nombre,
        hs.salario  AS salario
    FROM users_company uc
    JOIN tipo_identificacion ti ON uc.tipo_identificacion_idtipo_identificacion = ti.idtipo_identificacion
    LEFT JOIN estado_civil    ec  ON uc.estado_civil_idestado_civil = ec.idestado_civil
    LEFT JOIN grupo_sanguineo gs  ON uc.grupo_sanguineo_idgrupo_sanguineo = gs.idgrupo_sanguineo
    LEFT JOIN genero          g   ON uc.genero_idgenero = g.idgenero
    LEFT JOIN ciudad          cn  ON uc.ciudad_nacimiento_id = cn.idciudad
    LEFT JOIN ciudad          cex ON uc.ciudad_expedicion_id = cex.idciudad
    LEFT JOIN contrato c ON c.idcontrato = (
        SELECT MAX(c2.idcontrato) FROM contrato c2 WHERE c2.users_company_id = uc.id
    )
    LEFT JOIN campania        cam ON c.campania_idcampania = cam.idcampania
    LEFT JOIN cargo           car ON c.cargo_idcargo = car.idcargo
    LEFT JOIN area            ar  ON c.area_idarea = ar.idarea
    LEFT JOIN tipo_contrato   tc  ON c.tipo_contrato_idtipo_contrato = tc.idtipo_contrato
    LEFT JOIN estado_contrato esc ON c.estado_contrato_idestado_contrato = esc.idestado_contrato
    LEFT JOIN historial_salarial hs ON hs.contrato_idcontrato = c.idcontrato AND hs.fecha_vigencia_fin IS NULL
`;

// Mapea las claves del payload de seguridad social a su tipo en BD
const TIPOS_SEGURIDAD_SOCIAL = {
    eps_id: 'EPS',
    arl_id: 'ARL',
    afp_id: 'AFP',
    cesantias_id: 'CESANTIAS',
    caja_id: 'CAJA'
};

function val(x) {
    return x === undefined || x === null || x === '' ? null : x;
}

function nombrePropio(data) {
    return [data.primer_nombre, data.segundo_nombre, data.primer_apellido, data.segundo_apellido]
        .filter(Boolean)
        .join(' ');
}

function camposPersonales(data) {
    return [
        data.numero_identificacion, data.tipo_identificacion_id,
        val(data.fecha_expedicion), val(data.ciudad_expedicion_id),
        data.primer_nombre, val(data.segundo_nombre), data.primer_apellido, val(data.segundo_apellido), nombrePropio(data),
        val(data.fecha_nacimiento), val(data.ciudad_nacimiento_id), data.numero_hijos ?? 0,
        val(data.estado_civil_id), val(data.grupo_sanguineo_id), val(data.genero_id),
        val(data.email), val(data.telefono), val(data.usuario_ssff)
    ];
}

async function clienteDeCampania(conn, campaniaId) {
    const [rows] = await conn.query('SELECT Cliente_idCliente FROM campania WHERE idcampania = ?', [campaniaId]);
    if (rows.length === 0) throw new Error('La campaña seleccionada no existe');
    return rows[0].Cliente_idCliente;
}

async function estadoContratoActivo(conn) {
    const [rows] = await conn.query("SELECT idestado_contrato FROM estado_contrato WHERE nombre = 'activo'");
    if (rows.length === 0) throw new Error("No existe el estado de contrato 'activo' (ejecutar migración 035)");
    return rows[0].idestado_contrato;
}

async function insertarContrato(conn, ucId, contrato) {
    const clienteId = await clienteDeCampania(conn, contrato.campania_id);
    const estadoId = val(contrato.estado_contrato_id) || await estadoContratoActivo(conn);

    const [result] = await conn.query(
        `INSERT INTO contrato (
            users_company_id, Cliente_idCliente, campania_idcampania,
            area_idarea, centro_costo_idcentro_costo, cargo_idcargo,
            tipo_contrato_idtipo_contrato, modalidad_idmodalidad, oleada_idoleada,
            ciudad_idciudad, estado_contrato_idestado_contrato,
            jefe_inmediato_id, jefe_area_id,
            fecha_ingreso, fecha_fin_periodo_prueba, fecha_fin_contrato, observaciones
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            ucId, clienteId, contrato.campania_id,
            contrato.area_id, contrato.centro_costo_id, contrato.cargo_id,
            contrato.tipo_contrato_id, contrato.modalidad_id, contrato.oleada_id,
            contrato.ciudad_id, estadoId,
            val(contrato.jefe_inmediato_id), val(contrato.jefe_area_id),
            contrato.fecha_ingreso, val(contrato.fecha_fin_periodo_prueba),
            val(contrato.fecha_fin_contrato), val(contrato.observaciones)
        ]
    );
    return result.insertId;
}

async function insertarSalario(conn, contratoId, salario, fechaInicio) {
    await conn.query(
        `INSERT INTO historial_salarial (salario, bono_no_prestacional, bono_cafeteria, fecha_vigencia_inicio, contrato_idcontrato)
         VALUES (?, ?, ?, ?, ?)`,
        [salario.salario, salario.bono_no_prestacional ?? 0, salario.bono_cafeteria ?? 0, fechaInicio, contratoId]
    );
}

async function guardarSeguridadSocial(conn, ucId, seguridadSocial, fechaReferencia) {
    if (!seguridadSocial) return;

    for (const [clave, tipo] of Object.entries(TIPOS_SEGURIDAD_SOCIAL)) {
        const entidadId = val(seguridadSocial[clave]);
        if (!entidadId) continue;

        const [actuales] = await conn.query(
            'SELECT idseguridad_social, entidad_seguridad_social_id FROM seguridad_social WHERE users_company_id = ? AND tipo = ? AND activa = 1',
            [ucId, tipo]
        );

        if (actuales.length > 0 && actuales[0].entidad_seguridad_social_id === Number(entidadId)) continue;

        if (actuales.length > 0) {
            await conn.query(
                'UPDATE seguridad_social SET activa = 0, fecha_fin = CURDATE() WHERE idseguridad_social = ?',
                [actuales[0].idseguridad_social]
            );
        }

        const tarifaArl = tipo === 'ARL' ? val(seguridadSocial.tarifa_arl) : null;
        await conn.query(
            `INSERT INTO seguridad_social (tipo, fecha_afiliacion, tarifa_arl, fecha_inicio, activa, users_company_id, entidad_seguridad_social_id)
             VALUES (?, ?, ?, ?, 1, ?, ?)`,
            [tipo, fechaReferencia, tarifaArl, fechaReferencia, ucId, entidadId]
        );
    }
}

async function guardarCuentaBancaria(conn, ucId, cuenta) {
    if (!cuenta || !val(cuenta.numero_cuenta) || !val(cuenta.banco_id) || !val(cuenta.tipo_cuenta_id)) return;

    const [actuales] = await conn.query(
        'SELECT idcuenta_bancaria FROM cuenta_bancaria WHERE users_company_id = ? AND activa = 1',
        [ucId]
    );

    if (actuales.length > 0) {
        await conn.query(
            `UPDATE cuenta_bancaria SET numero_cuenta = ?, banco_idbanco = ?, tipo_cuenta_idtipo_cuenta = ?, updated_at = CURRENT_TIMESTAMP
             WHERE idcuenta_bancaria = ?`,
            [cuenta.numero_cuenta, cuenta.banco_id, cuenta.tipo_cuenta_id, actuales[0].idcuenta_bancaria]
        );
    } else {
        await conn.query(
            `INSERT INTO cuenta_bancaria (numero_cuenta, users_company_id, banco_idbanco, tipo_cuenta_idtipo_cuenta)
             VALUES (?, ?, ?, ?)`,
            [cuenta.numero_cuenta, ucId, cuenta.banco_id, cuenta.tipo_cuenta_id]
        );
    }
}

async function guardarDireccion(conn, ucId, direccion) {
    if (!direccion || !val(direccion.direccion) || !val(direccion.tipo_direccion_id)) return;

    const [actuales] = await conn.query(
        'SELECT iddireccion FROM direccion WHERE users_company_id = ? AND es_principal = 1',
        [ucId]
    );

    if (actuales.length > 0) {
        await conn.query(
            `UPDATE direccion SET tipo_direccion_idtipo_direccion = ?, direccion = ?, barrio = ?, ciudad_idciudad = ?, updated_at = CURRENT_TIMESTAMP
             WHERE iddireccion = ?`,
            [direccion.tipo_direccion_id, direccion.direccion, val(direccion.barrio), val(direccion.ciudad_id), actuales[0].iddireccion]
        );
    } else {
        await conn.query(
            `INSERT INTO direccion (tipo_direccion_idtipo_direccion, direccion, barrio, ciudad_idciudad, es_principal, users_company_id)
             VALUES (?, ?, ?, ?, 1, ?)`,
            [direccion.tipo_direccion_id, direccion.direccion, val(direccion.barrio), val(direccion.ciudad_id), ucId]
        );
    }
}

async function guardarContactoEmergencia(conn, ucId, contacto) {
    if (!contacto || !val(contacto.nombre) || !val(contacto.telefono) || !val(contacto.parentesco_id)) return;

    const [actuales] = await conn.query(
        'SELECT idcontacto_emergencia FROM contacto_emergencia WHERE users_company_id = ? ORDER BY idcontacto_emergencia LIMIT 1',
        [ucId]
    );

    if (actuales.length > 0) {
        await conn.query(
            `UPDATE contacto_emergencia SET nombre = ?, telefono = ?, parentesco_idparentesco = ?, updated_at = CURRENT_TIMESTAMP
             WHERE idcontacto_emergencia = ?`,
            [contacto.nombre, contacto.telefono, contacto.parentesco_id, actuales[0].idcontacto_emergencia]
        );
    } else {
        await conn.query(
            `INSERT INTO contacto_emergencia (nombre, telefono, parentesco_idparentesco, users_company_id)
             VALUES (?, ?, ?, ?)`,
            [contacto.nombre, contacto.telefono, contacto.parentesco_id, ucId]
        );
    }
}

class UserCompany {
    static async getAll() {
        const [rows] = await db.query(`
            ${SELECT_EMPLEADO}
            ORDER BY uc.primer_apellido ASC, uc.primer_nombre ASC
        `);
        return rows;
    }

    static async getById(id) {
        const [rows] = await db.query(`
            ${SELECT_EMPLEADO}
            WHERE uc.id = ?
        `, [id]);
        return rows[0];
    }

    // Empleado con todos sus registros relacionados (para el formulario de edición)
    static async getByIdCompleto(id) {
        const empleado = await this.getById(id);
        if (!empleado) return null;

        const [contratos] = await db.query(
            'SELECT * FROM contrato WHERE users_company_id = ? ORDER BY idcontrato DESC LIMIT 1',
            [id]
        );
        const contrato = contratos[0] || null;

        let salario = null;
        if (contrato) {
            const [salarios] = await db.query(
                'SELECT * FROM historial_salarial WHERE contrato_idcontrato = ? AND fecha_vigencia_fin IS NULL ORDER BY idhistorial_salarial DESC LIMIT 1',
                [contrato.idcontrato]
            );
            salario = salarios[0] || null;
        }

        const [segSocial] = await db.query(
            `SELECT ss.tipo, ss.entidad_seguridad_social_id, ss.tarifa_arl, ess.nombre AS entidad_nombre
             FROM seguridad_social ss
             JOIN entidad_seguridad_social ess ON ss.entidad_seguridad_social_id = ess.identidad_seguridad_social
             WHERE ss.users_company_id = ? AND ss.activa = 1`,
            [id]
        );
        const seguridad_social = {};
        for (const [clave, tipo] of Object.entries(TIPOS_SEGURIDAD_SOCIAL)) {
            const row = segSocial.find(s => s.tipo === tipo);
            seguridad_social[clave] = row ? row.entidad_seguridad_social_id : null;
            if (tipo === 'ARL' && row) seguridad_social.tarifa_arl = row.tarifa_arl;
        }

        const [cuentas] = await db.query(
            'SELECT * FROM cuenta_bancaria WHERE users_company_id = ? AND activa = 1 LIMIT 1',
            [id]
        );

        const [direcciones] = await db.query(
            'SELECT * FROM direccion WHERE users_company_id = ? AND es_principal = 1 LIMIT 1',
            [id]
        );

        const [contactos] = await db.query(
            'SELECT * FROM contacto_emergencia WHERE users_company_id = ? ORDER BY idcontacto_emergencia LIMIT 1',
            [id]
        );

        return {
            ...empleado,
            contrato,
            salario_actual: salario,
            seguridad_social,
            cuenta_bancaria: cuentas[0] || null,
            direccion: direcciones[0] || null,
            contacto_emergencia: contactos[0] || null
        };
    }

    static async create(data) {
        const [existing] = await db.query(
            'SELECT id FROM users_company WHERE tipo_identificacion_idtipo_identificacion = ? AND numero_identificacion = ?',
            [data.tipo_identificacion_id, data.numero_identificacion]
        );
        if (existing.length > 0) {
            throw new Error(`Ya existe un empleado con la identificación '${data.numero_identificacion}'`);
        }

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            const [result] = await conn.query(
                `INSERT INTO users_company (
                    numero_identificacion, tipo_identificacion_idtipo_identificacion,
                    fecha_expedicion, ciudad_expedicion_id,
                    primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, nombre_propio,
                    fecha_nacimiento, ciudad_nacimiento_id, numero_hijos,
                    estado_civil_idestado_civil, grupo_sanguineo_idgrupo_sanguineo, genero_idgenero,
                    email, telefono, usuario_ssff
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                camposPersonales(data)
            );
            const ucId = result.insertId;

            const contratoId = await insertarContrato(conn, ucId, data.contrato);
            await insertarSalario(conn, contratoId, data.salario, data.contrato.fecha_ingreso);
            await guardarSeguridadSocial(conn, ucId, data.seguridad_social, data.contrato.fecha_ingreso);
            await guardarCuentaBancaria(conn, ucId, data.cuenta_bancaria);
            await guardarDireccion(conn, ucId, data.direccion);
            await guardarContactoEmergencia(conn, ucId, data.contacto_emergencia);

            await conn.commit();
            return { id: ucId, ...data };
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    static async update(id, data) {
        const [existing] = await db.query(
            'SELECT id FROM users_company WHERE tipo_identificacion_idtipo_identificacion = ? AND numero_identificacion = ? AND id != ?',
            [data.tipo_identificacion_id, data.numero_identificacion, id]
        );
        if (existing.length > 0) {
            throw new Error(`Ya existe otro empleado con la identificación '${data.numero_identificacion}'`);
        }

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            const [result] = await conn.query(
                `UPDATE users_company SET
                    numero_identificacion = ?, tipo_identificacion_idtipo_identificacion = ?,
                    fecha_expedicion = ?, ciudad_expedicion_id = ?,
                    primer_nombre = ?, segundo_nombre = ?, primer_apellido = ?, segundo_apellido = ?, nombre_propio = ?,
                    fecha_nacimiento = ?, ciudad_nacimiento_id = ?, numero_hijos = ?,
                    estado_civil_idestado_civil = ?, grupo_sanguineo_idgrupo_sanguineo = ?, genero_idgenero = ?,
                    email = ?, telefono = ?, usuario_ssff = ?,
                    updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [...camposPersonales(data), id]
            );

            // Contrato: actualizar el vigente o crearlo si no existe
            const [contratos] = await conn.query(
                'SELECT idcontrato FROM contrato WHERE users_company_id = ? ORDER BY idcontrato DESC LIMIT 1',
                [id]
            );
            let contratoId;
            if (contratos.length > 0) {
                contratoId = contratos[0].idcontrato;
                const clienteId = await clienteDeCampania(conn, data.contrato.campania_id);
                const estadoId = val(data.contrato.estado_contrato_id) || await estadoContratoActivo(conn);
                await conn.query(
                    `UPDATE contrato SET
                        Cliente_idCliente = ?, campania_idcampania = ?,
                        area_idarea = ?, centro_costo_idcentro_costo = ?, cargo_idcargo = ?,
                        tipo_contrato_idtipo_contrato = ?, modalidad_idmodalidad = ?, oleada_idoleada = ?,
                        ciudad_idciudad = ?, estado_contrato_idestado_contrato = ?,
                        jefe_inmediato_id = ?, jefe_area_id = ?,
                        fecha_ingreso = ?, fecha_fin_periodo_prueba = ?, fecha_fin_contrato = ?, observaciones = ?,
                        updated_at = CURRENT_TIMESTAMP
                     WHERE idcontrato = ?`,
                    [
                        clienteId, data.contrato.campania_id,
                        data.contrato.area_id, data.contrato.centro_costo_id, data.contrato.cargo_id,
                        data.contrato.tipo_contrato_id, data.contrato.modalidad_id, data.contrato.oleada_id,
                        data.contrato.ciudad_id, estadoId,
                        val(data.contrato.jefe_inmediato_id), val(data.contrato.jefe_area_id),
                        data.contrato.fecha_ingreso, val(data.contrato.fecha_fin_periodo_prueba),
                        val(data.contrato.fecha_fin_contrato), val(data.contrato.observaciones),
                        contratoId
                    ]
                );
            } else {
                contratoId = await insertarContrato(conn, id, data.contrato);
            }

            // Salario: si cambió, cerrar la vigencia actual y abrir una nueva (historial)
            const [vigentes] = await conn.query(
                'SELECT * FROM historial_salarial WHERE contrato_idcontrato = ? AND fecha_vigencia_fin IS NULL ORDER BY idhistorial_salarial DESC LIMIT 1',
                [contratoId]
            );
            const nuevoSalario = {
                salario: Number(data.salario.salario),
                bono_no_prestacional: Number(data.salario.bono_no_prestacional ?? 0),
                bono_cafeteria: Number(data.salario.bono_cafeteria ?? 0)
            };
            if (vigentes.length === 0) {
                await insertarSalario(conn, contratoId, nuevoSalario, data.contrato.fecha_ingreso);
            } else {
                const actual = vigentes[0];
                const cambio = Number(actual.salario) !== nuevoSalario.salario
                    || Number(actual.bono_no_prestacional) !== nuevoSalario.bono_no_prestacional
                    || Number(actual.bono_cafeteria) !== nuevoSalario.bono_cafeteria;
                if (cambio) {
                    await conn.query(
                        'UPDATE historial_salarial SET fecha_vigencia_fin = CURDATE() WHERE idhistorial_salarial = ?',
                        [actual.idhistorial_salarial]
                    );
                    await insertarSalario(conn, contratoId, nuevoSalario, new Date().toISOString().substring(0, 10));
                }
            }

            await guardarSeguridadSocial(conn, id, data.seguridad_social, data.contrato.fecha_ingreso);
            await guardarCuentaBancaria(conn, id, data.cuenta_bancaria);
            await guardarDireccion(conn, id, data.direccion);
            await guardarContactoEmergencia(conn, id, data.contacto_emergencia);

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
        // contrato tiene FK RESTRICT hacia users_company: eliminar primero la cadena laboral
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            await conn.query('DELETE FROM contrato WHERE users_company_id = ?', [id]);
            const [result] = await conn.query('DELETE FROM users_company WHERE id = ?', [id]);
            await conn.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    static async getCatalogos() {
        const [tiposIdentificacion] = await db.query('SELECT idtipo_identificacion AS id, nombre, codigo FROM tipo_identificacion ORDER BY nombre');
        const [estadosCiviles] = await db.query('SELECT idestado_civil AS id, nombre FROM estado_civil ORDER BY idestado_civil');
        const [gruposSanguineos] = await db.query('SELECT idgrupo_sanguineo AS id, nombre FROM grupo_sanguineo ORDER BY idgrupo_sanguineo');
        const [generos] = await db.query('SELECT idgenero AS id, nombre FROM genero ORDER BY idgenero');
        const [ciudades] = await db.query('SELECT idciudad AS id, nombre FROM ciudad ORDER BY nombre');
        const [campanias] = await db.query(`
            SELECT cam.idcampania AS id, cam.nombre, cli.nombre AS cliente_nombre
            FROM campania cam JOIN cliente cli ON cam.Cliente_idCliente = cli.idCliente
            ORDER BY cam.nombre
        `);
        const [areas] = await db.query('SELECT idarea AS id, nombre FROM area ORDER BY nombre');
        const [centrosCosto] = await db.query('SELECT idcentro_costo AS id, codigo, nombre FROM centro_costo ORDER BY codigo');
        const [cargos] = await db.query('SELECT idcargo AS id, nombre FROM cargo ORDER BY nombre');
        const [tiposContrato] = await db.query('SELECT idtipo_contrato AS id, nombre FROM tipo_contrato ORDER BY idtipo_contrato');
        const [modalidades] = await db.query('SELECT idmodalidad AS id, nombre FROM modalidad ORDER BY idmodalidad');
        const [oleadas] = await db.query('SELECT idoleada AS id, nombre, fecha_inicio FROM oleada ORDER BY fecha_inicio DESC');
        const [estadosContrato] = await db.query('SELECT idestado_contrato AS id, nombre FROM estado_contrato ORDER BY idestado_contrato');
        const [entidades] = await db.query('SELECT identidad_seguridad_social AS id, tipo, nombre FROM entidad_seguridad_social ORDER BY tipo, nombre');
        const [bancos] = await db.query('SELECT idbanco AS id, nombre FROM banco ORDER BY nombre');
        const [tiposCuenta] = await db.query('SELECT idtipo_cuenta AS id, nombre FROM tipo_cuenta ORDER BY idtipo_cuenta');
        const [tiposDireccion] = await db.query('SELECT idtipo_direccion AS id, nombre FROM tipo_direccion ORDER BY idtipo_direccion');
        const [parentescos] = await db.query('SELECT idparentesco AS id, nombre FROM parentesco ORDER BY idparentesco');
        const [tiposNovedad] = await db.query('SELECT idtipo_novedad AS id, categoria, nombre FROM tipo_novedad ORDER BY categoria, nombre');
        const [empleados] = await db.query(`
            SELECT id, CONCAT_WS(' ', primer_nombre, segundo_nombre, primer_apellido, segundo_apellido) AS nombre_completo
            FROM users_company ORDER BY primer_apellido, primer_nombre
        `);

        return {
            tipos_identificacion: tiposIdentificacion,
            estados_civiles: estadosCiviles,
            grupos_sanguineos: gruposSanguineos,
            generos,
            ciudades,
            campanias,
            areas,
            centros_costo: centrosCosto,
            cargos,
            tipos_contrato: tiposContrato,
            modalidades,
            oleadas,
            estados_contrato: estadosContrato,
            entidades_eps: entidades.filter(e => e.tipo === 'EPS'),
            entidades_arl: entidades.filter(e => e.tipo === 'ARL'),
            entidades_afp: entidades.filter(e => e.tipo === 'AFP'),
            entidades_cesantias: entidades.filter(e => e.tipo === 'CESANTIAS'),
            entidades_caja: entidades.filter(e => e.tipo === 'CAJA'),
            bancos,
            tipos_cuenta: tiposCuenta,
            tipos_direccion: tiposDireccion,
            parentescos,
            tipos_novedad: tiposNovedad,
            empleados
        };
    }

    static async getGastoTotal() {
        const [rows] = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM users_company) AS total_empleados,
                SUM(hs.salario)      AS gasto_mensual_total,
                SUM(hs.salario) * 12 AS gasto_anual_total,
                AVG(hs.salario)      AS salario_promedio
            FROM historial_salarial hs
            JOIN contrato c ON hs.contrato_idcontrato = c.idcontrato
            WHERE hs.fecha_vigencia_fin IS NULL
        `);
        return rows[0];
    }

    static async getActivos(ucId) {
        const [rows] = await db.query(`
            SELECT
                a.*,
                u.full_name AS created_by_name
            FROM activos a
            LEFT JOIN users u ON a.created_by_id = u.id
            WHERE a.agente_id = ?
            ORDER BY a.created_at DESC
        `, [ucId]);
        return rows;
    }

    static async assignActivo(ucId, activoId) {
        const [result] = await db.query(
            'UPDATE activos SET agente_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [ucId, activoId]
        );
        return result.affectedRows > 0;
    }

    static async unassignActivo(activoId) {
        const [result] = await db.query(
            'UPDATE activos SET agente_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [activoId]
        );
        return result.affectedRows > 0;
    }
}

module.exports = UserCompany;
