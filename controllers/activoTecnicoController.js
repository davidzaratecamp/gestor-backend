const Activo = require('../models/Activo');
const ActivoHistorial = require('../models/ActivoHistorial');
const db = require('../config/db');

// Tipos de activos editables por el técnico de inventario
const TIPOS_EDITABLES = ['ECC-CPU', 'ECC-POR', 'ECC-SER'];

// Campos de componentes que puede editar el técnico
const CAMPOS_EDITABLES = ['cpu_procesador', 'memoria_ram', 'almacenamiento', 'sistema_operativo'];

// Labels para mostrar nombres amigables
const CAMPO_LABELS = {
    cpu_procesador: 'CPU / Procesador',
    memoria_ram: 'Memoria RAM',
    almacenamiento: 'Almacenamiento',
    sistema_operativo: 'Sistema Operativo'
};

/**
 * @desc    Obtener activos editables (solo CPU, Portátil, Servidor)
 * @route   GET /api/activos-tecnico
 * @access  Private (tecnicoInventario, gestorActivos, admin)
 */
exports.getActivosEditables = async (req, res) => {
    try {
        const { numero_placa, ubicacion } = req.query;

        let query = `
            SELECT
                a.id,
                a.numero_placa,
                a.tipo_activo,
                a.ubicacion,
                a.site,
                a.responsable,
                a.asignado,
                a.puesto,
                a.marca_modelo,
                a.cpu_procesador,
                a.memoria_ram,
                a.almacenamiento,
                a.sistema_operativo,
                a.estado
            FROM activos a
            WHERE a.tipo_activo IN (?, ?, ?)
        `;
        const params = [...TIPOS_EDITABLES];

        // Filtro por número de placa
        if (numero_placa) {
            const normalizedSearch = numero_placa.replace(/'/g, '-');
            query += ' AND (a.numero_placa LIKE ? OR a.numero_placa LIKE ?)';
            params.push(`%${numero_placa}%`);
            params.push(`%${normalizedSearch}%`);
        }

        // Filtro por ubicación
        if (ubicacion) {
            query += ' AND a.ubicacion = ?';
            params.push(ubicacion);
        }

        query += ' ORDER BY a.numero_placa ASC';

        const [rows] = await db.query(query, params);

        res.json({
            success: true,
            data: rows,
            tiposEditables: TIPOS_EDITABLES
        });
    } catch (err) {
        console.error('Error al obtener activos editables:', err.message);
        res.status(500).json({
            success: false,
            msg: 'Error del servidor al obtener activos'
        });
    }
};

/**
 * @desc    Obtener componentes editables de un activo
 * @route   GET /api/activos-tecnico/:id/componentes
 * @access  Private (tecnicoInventario, gestorActivos, admin)
 */
exports.getComponentesActivo = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(`
            SELECT
                id,
                numero_placa,
                tipo_activo,
                cpu_procesador,
                memoria_ram,
                almacenamiento,
                sistema_operativo,
                marca_modelo,
                ubicacion,
                site,
                responsable,
                asignado
            FROM activos
            WHERE id = ? AND tipo_activo IN (?, ?, ?)
        `, [id, ...TIPOS_EDITABLES]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                msg: 'Activo no encontrado o no es un tipo editable (CPU, Portátil o Servidor)'
            });
        }

        const activo = rows[0];

        // Construir respuesta con componentes
        const componentes = CAMPOS_EDITABLES.map(campo => ({
            campo,
            label: CAMPO_LABELS[campo],
            valorActual: activo[campo] || null
        }));

        res.json({
            success: true,
            activo: {
                id: activo.id,
                numero_placa: activo.numero_placa,
                tipo_activo: activo.tipo_activo,
                marca_modelo: activo.marca_modelo,
                ubicacion: activo.ubicacion,
                site: activo.site,
                responsable: activo.responsable,
                asignado: activo.asignado
            },
            componentes,
            camposEditables: CAMPOS_EDITABLES
        });
    } catch (err) {
        console.error('Error al obtener componentes:', err.message);
        res.status(500).json({
            success: false,
            msg: 'Error del servidor al obtener componentes'
        });
    }
};

/**
 * @desc    Actualizar un componente de hardware y registrar en historial
 * @route   PUT /api/activos-tecnico/:id/componente
 * @access  Private (tecnicoInventario, gestorActivos, admin)
 */
exports.actualizarComponente = async (req, res) => {
    try {
        const { id } = req.params;
        const { campo, nuevoValor } = req.body;
        const usuarioId = req.user.id;

        // Validar que el campo es editable
        if (!CAMPOS_EDITABLES.includes(campo)) {
            return res.status(400).json({
                success: false,
                msg: `Campo no permitido. Solo se pueden editar: ${CAMPOS_EDITABLES.join(', ')}`
            });
        }

        // Validar que el nuevo valor no está vacío
        if (!nuevoValor || nuevoValor.trim() === '') {
            return res.status(400).json({
                success: false,
                msg: 'El nuevo valor no puede estar vacío'
            });
        }

        // Verificar que el activo existe y es de tipo editable
        const [activos] = await db.query(`
            SELECT id, numero_placa, tipo_activo, ${campo} as valor_actual
            FROM activos
            WHERE id = ? AND tipo_activo IN (?, ?, ?)
        `, [id, ...TIPOS_EDITABLES]);

        if (activos.length === 0) {
            return res.status(404).json({
                success: false,
                msg: 'Activo no encontrado o no es un tipo editable'
            });
        }

        const activo = activos[0];
        const valorAnterior = activo.valor_actual;

        // Verificar que el valor realmente cambió
        if (valorAnterior === nuevoValor.trim()) {
            return res.status(400).json({
                success: false,
                msg: 'El nuevo valor es igual al valor actual'
            });
        }

        // Actualizar el campo en la tabla activos
        const updateQuery = `UPDATE activos SET ${campo} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        await db.query(updateQuery, [nuevoValor.trim(), id]);

        // Registrar el cambio en el historial
        await ActivoHistorial.registrarCambio(
            id,
            campo,
            valorAnterior,
            nuevoValor.trim(),
            usuarioId
        );

        res.json({
            success: true,
            msg: `${CAMPO_LABELS[campo]} actualizado correctamente`,
            data: {
                activoId: id,
                numero_placa: activo.numero_placa,
                campo,
                valorAnterior,
                valorNuevo: nuevoValor.trim()
            }
        });
    } catch (err) {
        console.error('Error al actualizar componente:', err.message);
        res.status(500).json({
            success: false,
            msg: 'Error del servidor al actualizar componente'
        });
    }
};

/**
 * @desc    Obtener historial de cambios de un activo
 * @route   GET /api/activos-tecnico/:id/historial
 * @access  Private (gestorActivos, admin) - NO tecnicoInventario
 */
exports.getHistorialActivo = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el activo existe
        const activo = await Activo.getById(id);
        if (!activo) {
            return res.status(404).json({
                success: false,
                msg: 'Activo no encontrado'
            });
        }

        // Obtener historial
        const historial = await ActivoHistorial.getByActivoId(id);

        res.json({
            success: true,
            activo: {
                id: activo.id,
                numero_placa: activo.numero_placa,
                tipo_activo: activo.tipo_activo
            },
            historial: historial.map(h => ({
                id: h.id,
                campo: h.campo_modificado,
                campoLabel: CAMPO_LABELS[h.campo_modificado],
                valorAnterior: h.valor_anterior,
                valorNuevo: h.valor_nuevo,
                modificadoPor: h.modificado_por_nombre || h.modificado_por_usuario,
                fecha: h.fecha_modificacion
            }))
        });
    } catch (err) {
        console.error('Error al obtener historial:', err.message);
        res.status(500).json({
            success: false,
            msg: 'Error del servidor al obtener historial'
        });
    }
};

/**
 * @desc    Obtener todo el historial de cambios (para reportes admin)
 * @route   GET /api/activos-tecnico/historial
 * @access  Private (gestorActivos, admin)
 */
exports.getAllHistorial = async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;

        const historial = await ActivoHistorial.getAll(
            parseInt(limit),
            parseInt(offset)
        );
        const total = await ActivoHistorial.countAll();

        res.json({
            success: true,
            data: historial.map(h => ({
                id: h.id,
                activoId: h.activo_id,
                numeroPlaca: h.numero_placa,
                tipoActivo: h.tipo_activo,
                campo: h.campo_modificado,
                campoLabel: CAMPO_LABELS[h.campo_modificado],
                valorAnterior: h.valor_anterior,
                valorNuevo: h.valor_nuevo,
                modificadoPor: h.modificado_por_nombre || h.modificado_por_usuario,
                fecha: h.fecha_modificacion
            })),
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (err) {
        console.error('Error al obtener historial general:', err.message);
        res.status(500).json({
            success: false,
            msg: 'Error del servidor al obtener historial'
        });
    }
};
