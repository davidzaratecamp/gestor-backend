const Workstation = require('../models/Workstation');

// @desc    Obtener todas las estaciones de trabajo
// @route   GET /api/workstations
// @access  Private
exports.getAllWorkstations = async (req, res) => {
    try {
        // Obtener workstations visibles según el rol y sede del usuario
        const userRole = req.user.role;
        const userSede = req.user.sede;
        
        const workstations = await Workstation.getVisibleForUser(userRole, userSede);
        res.json(workstations);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener una estación de trabajo por ID
// @route   GET /api/workstations/:id
// @access  Private
exports.getWorkstationById = async (req, res) => {
    try {
        const workstation = await Workstation.getById(req.params.id);
        
        if (!workstation) {
            return res.status(404).json({ msg: 'Estación de trabajo no encontrada' });
        }
        
        res.json(workstation);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Crear nueva estación de trabajo
// @route   POST /api/workstations
// @access  Private (Admin)
exports.createWorkstation = async (req, res) => {
    const { station_code, location_details, sede, departamento, anydesk_address, advisor_cedula } = req.body;

    // Validaciones
    if (!station_code) {
        return res.status(400).json({ msg: 'El código de estación es requerido' });
    }

    // Validaciones especiales para Barranquilla (trabajo remoto)
    if (sede === 'barranquilla') {
        if (!anydesk_address) {
            return res.status(400).json({ msg: 'La dirección AnyDesk es requerida para estaciones de Barranquilla' });
        }
        if (!advisor_cedula) {
            return res.status(400).json({ msg: 'La cédula del asesor es requerida para estaciones de Barranquilla' });
        }
    }

    try {
        // Verificar si ya existe una estación con ese código
        const existingWorkstation = await Workstation.getByStationCode(station_code);
        if (existingWorkstation) {
            return res.status(400).json({ msg: 'Ya existe una estación con ese código' });
        }

        const workstationData = {
            station_code,
            location_details: location_details || '',
            sede: sede || 'bogota',
            departamento: departamento || 'claro'
        };

        // Agregar campos de trabajo remoto si es Barranquilla
        if (sede === 'barranquilla') {
            workstationData.anydesk_address = anydesk_address;
            workstationData.advisor_cedula = advisor_cedula;
        }

        const newWorkstation = await Workstation.create(workstationData);

        res.status(201).json({
            msg: 'Estación de trabajo creada exitosamente',
            workstation: newWorkstation
        });
    } catch (err) {
        console.error(err.message);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ msg: 'Ya existe una estación con ese código' });
        }
        res.status(500).send('Error del servidor');
    }
};

// @desc    Actualizar estación de trabajo
// @route   PUT /api/workstations/:id
// @access  Private (Admin)
exports.updateWorkstation = async (req, res) => {
    const { station_code, location_details, sede, departamento, anydesk_address, advisor_cedula } = req.body;

    if (!station_code) {
        return res.status(400).json({ msg: 'El código de estación es requerido' });
    }

    // Validaciones especiales para Barranquilla (trabajo remoto)
    if (sede === 'barranquilla') {
        if (!anydesk_address) {
            return res.status(400).json({ msg: 'La dirección AnyDesk es requerida para estaciones de Barranquilla' });
        }
        if (!advisor_cedula) {
            return res.status(400).json({ msg: 'La cédula del asesor es requerida para estaciones de Barranquilla' });
        }
    }

    try {
        const workstationExists = await Workstation.getById(req.params.id);
        if (!workstationExists) {
            return res.status(404).json({ msg: 'Estación de trabajo no encontrada' });
        }

        // Verificar si el nuevo código ya existe en otra estación
        const existingWorkstation = await Workstation.getByStationCode(station_code);
        if (existingWorkstation && existingWorkstation.id !== parseInt(req.params.id)) {
            return res.status(400).json({ msg: 'Ya existe otra estación con ese código' });
        }

        const updateData = {
            station_code,
            location_details: location_details || '',
            sede: sede || 'bogota',
            departamento: departamento || 'claro'
        };

        // Manejar campos de trabajo remoto
        updateData.anydesk_address = sede === 'barranquilla' ? anydesk_address : null;
        updateData.advisor_cedula = sede === 'barranquilla' ? advisor_cedula : null;

        const updated = await Workstation.update(req.params.id, updateData);

        if (updated) {
            res.json({ msg: 'Estación de trabajo actualizada exitosamente' });
        } else {
            res.status(400).json({ msg: 'No se pudo actualizar la estación de trabajo' });
        }
    } catch (err) {
        console.error(err.message);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ msg: 'Ya existe una estación con ese código' });
        }
        res.status(500).send('Error del servidor');
    }
};

// @desc    Eliminar estación de trabajo
// @route   DELETE /api/workstations/:id
// @access  Private (Admin)
exports.deleteWorkstation = async (req, res) => {
    try {
        const workstation = await Workstation.getById(req.params.id);
        if (!workstation) {
            return res.status(404).json({ msg: 'Estación de trabajo no encontrada' });
        }

        const deleted = await Workstation.delete(req.params.id);
        
        if (deleted) {
            res.json({ msg: 'Estación de trabajo eliminada exitosamente' });
        } else {
            res.status(400).json({ msg: 'No se pudo eliminar la estación de trabajo' });
        }
    } catch (err) {
        console.error(err.message);
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ 
                msg: 'No se puede eliminar la estación porque tiene incidencias asociadas' 
            });
        }
        res.status(500).send('Error del servidor');
    }
};