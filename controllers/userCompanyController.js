const UserCompany = require('../models/UserCompany');

const CAMPOS_PERSONALES = [
    'numero_identificacion', 'tipo_identificacion_id', 'fecha_expedicion', 'ciudad_expedicion_id',
    'primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido',
    'fecha_nacimiento', 'ciudad_nacimiento_id', 'numero_hijos',
    'estado_civil_id', 'grupo_sanguineo_id', 'genero_id',
    'email', 'telefono', 'usuario_ssff'
];

const CAMPOS_CONTRATO_OBLIGATORIOS = {
    campania_id: 'campaña',
    area_id: 'área',
    centro_costo_id: 'centro de costo',
    cargo_id: 'cargo',
    tipo_contrato_id: 'tipo de contrato',
    modalidad_id: 'modalidad',
    oleada_id: 'oleada',
    ciudad_id: 'ciudad del contrato',
    fecha_ingreso: 'fecha de ingreso'
};

function extraerCampos(body) {
    const data = {};
    for (const campo of CAMPOS_PERSONALES) {
        data[campo] = body[campo];
    }
    data.contrato = body.contrato || {};
    data.salario = body.salario || {};
    data.seguridad_social = body.seguridad_social || {};
    data.cuenta_bancaria = body.cuenta_bancaria || {};
    data.direccion = body.direccion || {};
    data.contacto_emergencia = body.contacto_emergencia || {};
    return data;
}

function validarObligatorios(data) {
    if (!data.numero_identificacion || !data.tipo_identificacion_id || !data.primer_nombre || !data.primer_apellido) {
        return 'Los campos tipo de identificación, número de identificación, primer nombre y primer apellido son obligatorios';
    }

    const faltantes = Object.entries(CAMPOS_CONTRATO_OBLIGATORIOS)
        .filter(([campo]) => !data.contrato[campo])
        .map(([, nombre]) => nombre);
    if (faltantes.length > 0) {
        return `Faltan campos obligatorios del contrato: ${faltantes.join(', ')}`;
    }

    if (!data.salario.salario || Number(data.salario.salario) <= 0) {
        return 'El salario es obligatorio y debe ser mayor a cero';
    }

    return null;
}

const userCompanyController = {
    async getAll(req, res) {
        try {
            const empleados = await UserCompany.getAll();
            res.json({ empleados });
        } catch (error) {
            console.error('Error al obtener empleados:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
        }
    },

    async getById(req, res) {
        try {
            const empleado = await UserCompany.getByIdCompleto(req.params.id);
            if (!empleado) {
                return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
            }
            res.json({ empleado });
        } catch (error) {
            console.error('Error al obtener empleado:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
        }
    },

    async getCatalogos(req, res) {
        try {
            const catalogos = await UserCompany.getCatalogos();
            res.json({ catalogos });
        } catch (error) {
            console.error('Error al obtener catálogos:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
        }
    },

    async create(req, res) {
        try {
            const data = extraerCampos(req.body);

            const errorValidacion = validarObligatorios(data);
            if (errorValidacion) {
                return res.status(400).json({ success: false, message: errorValidacion });
            }

            const empleado = await UserCompany.create(data);
            res.status(201).json({ success: true, message: 'Empleado creado exitosamente', empleado });
        } catch (error) {
            console.error('Error al crear empleado:', error);
            if (error.message.includes('Ya existe')) {
                return res.status(409).json({ success: false, message: error.message, type: 'DUPLICATE_IDENTIFICACION' });
            }
            res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            const data = extraerCampos(req.body);

            const existe = await UserCompany.getById(id);
            if (!existe) {
                return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
            }

            const errorValidacion = validarObligatorios(data);
            if (errorValidacion) {
                return res.status(400).json({ success: false, message: errorValidacion });
            }

            const actualizado = await UserCompany.update(id, data);
            if (!actualizado) {
                return res.status(404).json({ success: false, message: 'No se pudo actualizar el empleado' });
            }
            res.json({ success: true, message: 'Empleado actualizado exitosamente' });
        } catch (error) {
            console.error('Error al actualizar empleado:', error);
            if (error.message.includes('Ya existe')) {
                return res.status(409).json({ success: false, message: error.message, type: 'DUPLICATE_IDENTIFICACION' });
            }
            res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;

            const existe = await UserCompany.getById(id);
            if (!existe) {
                return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
            }

            await UserCompany.delete(id);
            res.json({ success: true, message: 'Empleado eliminado exitosamente. Los activos asignados quedaron sin empleado.' });
        } catch (error) {
            console.error('Error al eliminar empleado:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
        }
    },

    async getGastoTotal(req, res) {
        try {
            const gasto = await UserCompany.getGastoTotal();
            res.json({ gasto });
        } catch (error) {
            console.error('Error al obtener gasto total:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
        }
    },

    async getActivos(req, res) {
        try {
            const { id } = req.params;

            const existe = await UserCompany.getById(id);
            if (!existe) {
                return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
            }

            const activos = await UserCompany.getActivos(id);
            res.json({ empleado: existe, activos });
        } catch (error) {
            console.error('Error al obtener activos del empleado:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
        }
    },

    async assignActivo(req, res) {
        try {
            const { id, activoId } = req.params;

            const empleado = await UserCompany.getById(id);
            if (!empleado) {
                return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
            }

            const ok = await UserCompany.assignActivo(id, activoId);
            if (!ok) {
                return res.status(404).json({ success: false, message: 'Activo no encontrado' });
            }
            res.json({ success: true, message: 'Activo asignado exitosamente' });
        } catch (error) {
            console.error('Error al asignar activo:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
        }
    },

    async unassignActivo(req, res) {
        try {
            const { id, activoId } = req.params;

            const empleado = await UserCompany.getById(id);
            if (!empleado) {
                return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
            }

            const ok = await UserCompany.unassignActivo(activoId);
            if (!ok) {
                return res.status(404).json({ success: false, message: 'Activo no encontrado' });
            }
            res.json({ success: true, message: 'Activo desasignado exitosamente' });
        } catch (error) {
            console.error('Error al desasignar activo:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
        }
    }
};

module.exports = userCompanyController;
