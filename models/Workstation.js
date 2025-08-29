const db = require('../config/db');

class Workstation {
    static async getAll() {
        try {
            const [rows] = await db.query('SELECT * FROM workstations ORDER BY station_code');
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getById(id) {
        try {
            const [rows] = await db.query('SELECT * FROM workstations WHERE id = ?', [id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async getByStationCode(stationCode) {
        try {
            const [rows] = await db.query('SELECT * FROM workstations WHERE station_code = ?', [stationCode]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async create(stationData) {
        try {
            const { station_code, location_details, sede, departamento, anydesk_address, advisor_cedula } = stationData;
            
            // Construir query dinámicamente según los campos presentes
            let fields = ['station_code', 'location_details', 'sede', 'departamento'];
            let values = [station_code, location_details, sede, departamento];
            let placeholders = ['?', '?', '?', '?'];
            
            if (anydesk_address) {
                fields.push('anydesk_address');
                values.push(anydesk_address);
                placeholders.push('?');
            }
            
            if (advisor_cedula) {
                fields.push('advisor_cedula');
                values.push(advisor_cedula);
                placeholders.push('?');
            }
            
            const query = `INSERT INTO workstations (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
            const [result] = await db.query(query, values);
            
            return { id: result.insertId, ...stationData };
        } catch (error) {
            throw error;
        }
    }

    static async update(id, stationData) {
        try {
            const { station_code, location_details, sede, departamento, anydesk_address, advisor_cedula } = stationData;
            
            // Construir query dinámicamente según los campos presentes
            let updates = ['station_code = ?', 'location_details = ?', 'sede = ?', 'departamento = ?'];
            let values = [station_code, location_details, sede, departamento];
            
            if (anydesk_address !== undefined) { // Permitir actualizar incluso si es null
                updates.push('anydesk_address = ?');
                values.push(anydesk_address);
            }
            
            if (advisor_cedula !== undefined) { // Permitir actualizar incluso si es null
                updates.push('advisor_cedula = ?');
                values.push(advisor_cedula);
            }
            
            values.push(id); // ID va al final para la cláusula WHERE
            
            const query = `UPDATE workstations SET ${updates.join(', ')} WHERE id = ?`;
            const [result] = await db.query(query, values);
            
            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    static async delete(id) {
        try {
            const [result] = await db.query('DELETE FROM workstations WHERE id = ?', [id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    static async getBySede(sede) {
        try {
            const [rows] = await db.query(
                'SELECT * FROM workstations WHERE sede = ? ORDER BY station_code', 
                [sede]
            );
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getBySedeAndDepartamento(sede, departamento) {
        try {
            const [rows] = await db.query(
                'SELECT * FROM workstations WHERE sede = ? AND departamento = ? ORDER BY station_code', 
                [sede, departamento]
            );
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async findOrCreateByCode(stationCode, departamento, sede = 'bogota') {
        try {
            // Primero intentar encontrar la estación existente
            const existingStation = await this.getByStationCode(stationCode);
            
            if (existingStation) {
                return existingStation;
            }
            
            // Si no existe, crearla automáticamente
            const locationDetails = `Puesto ${stationCode} - ${departamento.toUpperCase()}`;
            
            const newStation = await this.create({
                station_code: stationCode,
                location_details: locationDetails,
                sede: sede,
                departamento: departamento
            });
            
            return newStation;
        } catch (error) {
            throw error;
        }
    }

    static async getVisibleForUser(userRole, userSede) {
        try {
            // Lógica de visibilidad:
            // - Admin: ve todo
            // - Técnicos Bogotá: ven Bogotá y Barranquilla
            // - Técnicos Villavicencio: ven Villavicencio y Barranquilla
            // - Supervisores: ven todo (por ahora)
            
            let query = 'SELECT * FROM workstations';
            let params = [];
            
            if (userRole === 'technician') {
                if (userSede === 'bogota') {
                    query += ' WHERE sede IN ("bogota", "barranquilla")';
                } else if (userSede === 'villavicencio') {
                    query += ' WHERE sede IN ("villavicencio", "barranquilla")';
                }
            }
            // Admin y supervisor ven todo
            
            query += ' ORDER BY sede, departamento, station_code';
            
            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Workstation;