const Activo = require('../models/Activo');
const path = require('path');
const fs = require('fs');

const activoController = {
    // Obtener todos los activos
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
            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor', 
                error: error.message 
            });
        }
    },

    // Obtener un activo por ID
    async getActivoById(req, res) {
        try {
            const { id } = req.params;
            const activo = await Activo.getById(id);

            if (!activo) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Activo no encontrado' 
                });
            }

            res.json({ activo });
        } catch (error) {
            console.error('Error al obtener activo:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor', 
                error: error.message 
            });
        }
    },

    // Crear un nuevo activo
    async createActivo(req, res) {
        try {
            const activoData = req.body;
            const createdById = req.user.id;

            // Validaciones básicas
            if (!activoData.numero_placa || !activoData.ubicacion || !activoData.responsable || !activoData.clasificacion) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Los campos número de placa, ubicación, responsable y clasificación son obligatorios' 
                });
            }

            if (!activoData.centro_costes || activoData.centro_costes < 1 || activoData.centro_costes > 10) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'El centro de costes debe ser un número entre 1 y 10' 
                });
            }

            // Validar valor si se proporciona
            if (activoData.valor && (isNaN(activoData.valor) || parseFloat(activoData.valor) < 0)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'El valor del activo debe ser un número positivo' 
                });
            }

            // Validar ubicaciones permitidas
            const ubicacionesPermitidas = ['Claro', 'Obama', 'IT', 'Contratación', 'Reclutamiento', 'Selección', 'Finanzas'];
            if (!ubicacionesPermitidas.includes(activoData.ubicacion)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Ubicación no válida' 
                });
            }

            // Validar clasificaciones permitidas
            const clasificacionesPermitidas = ['Activo productivo', 'Activo no productivo'];
            if (!clasificacionesPermitidas.includes(activoData.clasificacion)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Clasificación no válida' 
                });
            }

            // Manejar archivo adjunto si existe
            if (req.file) {
                activoData.adjunto_archivo = req.file.filename;
            }

            const nuevoActivo = await Activo.create(activoData, createdById);

            res.status(201).json({ 
                success: true, 
                message: 'Activo creado exitosamente', 
                activo: nuevoActivo 
            });
        } catch (error) {
            console.error('Error al crear activo:', error);
            
            // Si hay error y se subió un archivo, eliminarlo
            if (req.file) {
                const filePath = path.join(__dirname, '../uploads/activos', req.file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor', 
                error: error.message 
            });
        }
    },

    // Actualizar un activo
    async updateActivo(req, res) {
        try {
            const { id } = req.params;
            const activoData = req.body;

            // Verificar que el activo existe
            const activoExistente = await Activo.getById(id);
            if (!activoExistente) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Activo no encontrado' 
                });
            }

            // Validaciones básicas
            if (!activoData.numero_placa || !activoData.ubicacion || !activoData.responsable || !activoData.clasificacion) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Los campos número de placa, ubicación, responsable y clasificación son obligatorios' 
                });
            }

            if (!activoData.centro_costes || activoData.centro_costes < 1 || activoData.centro_costes > 10) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'El centro de costes debe ser un número entre 1 y 10' 
                });
            }

            // Validar valor si se proporciona
            if (activoData.valor && (isNaN(activoData.valor) || parseFloat(activoData.valor) < 0)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'El valor del activo debe ser un número positivo' 
                });
            }

            // Manejar archivo adjunto si existe
            if (req.file) {
                // Eliminar archivo anterior si existe
                if (activoExistente.adjunto_archivo) {
                    const oldFilePath = path.join(__dirname, '../uploads/activos', activoExistente.adjunto_archivo);
                    if (fs.existsSync(oldFilePath)) {
                        fs.unlinkSync(oldFilePath);
                    }
                }
                activoData.adjunto_archivo = req.file.filename;
            } else {
                // Mantener el archivo existente si no se sube uno nuevo
                activoData.adjunto_archivo = activoExistente.adjunto_archivo;
            }

            const actualizado = await Activo.update(id, activoData);

            if (!actualizado) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'No se pudo actualizar el activo' 
                });
            }

            res.json({ 
                success: true, 
                message: 'Activo actualizado exitosamente' 
            });
        } catch (error) {
            console.error('Error al actualizar activo:', error);
            
            // Si hay error y se subió un archivo, eliminarlo
            if (req.file) {
                const filePath = path.join(__dirname, '../uploads/activos', req.file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor', 
                error: error.message 
            });
        }
    },

    // Eliminar un activo
    async deleteActivo(req, res) {
        try {
            const { id } = req.params;

            // Verificar que el activo existe
            const activoExistente = await Activo.getById(id);
            if (!activoExistente) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Activo no encontrado' 
                });
            }

            // Eliminar archivo adjunto si existe
            if (activoExistente.adjunto_archivo) {
                const filePath = path.join(__dirname, '../uploads/activos', activoExistente.adjunto_archivo);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            const eliminado = await Activo.delete(id);

            if (!eliminado) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'No se pudo eliminar el activo' 
                });
            }

            res.json({ 
                success: true, 
                message: 'Activo eliminado exitosamente' 
            });
        } catch (error) {
            console.error('Error al eliminar activo:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor', 
                error: error.message 
            });
        }
    },

    // Obtener responsables disponibles
    async getResponsables(req, res) {
        try {
            const responsables = await Activo.getResponsables();
            res.json({ responsables });
        } catch (error) {
            console.error('Error al obtener responsables:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor', 
                error: error.message 
            });
        }
    },

    // Obtener estadísticas de activos
    async getStats(req, res) {
        try {
            const stats = await Activo.getStats();
            res.json({ stats });
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor', 
                error: error.message 
            });
        }
    }
};

module.exports = activoController;