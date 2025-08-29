const db = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
    static async getAll() {
        try {
            const [rows] = await db.query(
                'SELECT id, username, full_name, role, sede, departamento, created_at FROM users ORDER BY full_name'
            );
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getById(id) {
        try {
            const [rows] = await db.query(
                'SELECT id, username, full_name, role, sede, departamento, created_at FROM users WHERE id = ?', 
                [id]
            );
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async getByUsername(username) {
        try {
            const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async getTechnicians() {
        try {
            const [rows] = await db.query(
                'SELECT id, username, full_name, sede, departamento FROM users WHERE role = "technician" ORDER BY full_name'
            );
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getTechniciansBySede(sede) {
        try {
            const [rows] = await db.query(
                'SELECT id, username, full_name, sede, departamento FROM users WHERE role = "technician" AND sede = ? ORDER BY full_name',
                [sede]
            );
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getAvailableTechniciansForIncident(incidentSede) {
        try {
            // Lógica de visibilidad:
            // - Técnicos de Bogotá: ven Bogotá y Barranquilla
            // - Técnicos de Villavicencio: ven Villavicencio y Barranquilla
            // - Barranquilla no tiene técnicos propios
            
            let query;
            let params;
            
            if (incidentSede === 'barranquilla') {
                // Para Barranquilla, pueden ayudar técnicos de Bogotá o Villavicencio
                query = `
                    SELECT id, username, full_name, sede, departamento 
                    FROM users 
                    WHERE role = "technician" AND sede IN ("bogota", "villavicencio")
                    ORDER BY full_name
                `;
                params = [];
            } else {
                // Para Bogotá y Villavicencio, solo técnicos de la misma sede
                query = `
                    SELECT id, username, full_name, sede, departamento 
                    FROM users 
                    WHERE role = "technician" AND sede = ?
                    ORDER BY full_name
                `;
                params = [incidentSede];
            }
            
            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async create(userData) {
        try {
            const { username, password, full_name, role, sede, departamento } = userData;
            
            // Hash de la contraseña
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            // Construir query dinámicamente según los campos presentes
            let fields = ['username', 'password', 'full_name', 'role'];
            let values = [username, hashedPassword, full_name, role];
            let placeholders = ['?', '?', '?', '?'];
            
            if (sede) {
                fields.push('sede');
                values.push(sede);
                placeholders.push('?');
            }
            
            if (departamento) {
                fields.push('departamento');
                values.push(departamento);
                placeholders.push('?');
            }
            
            const query = `INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
            const [result] = await db.query(query, values);
            
            return { id: result.insertId, username, full_name, role, sede, departamento };
        } catch (error) {
            throw error;
        }
    }

    static async update(id, userData) {
        try {
            const { username, full_name, role, sede, departamento } = userData;
            
            // Construir query dinámicamente según los campos presentes
            let updates = ['username = ?', 'full_name = ?', 'role = ?'];
            let values = [username, full_name, role];
            
            if (sede) {
                updates.push('sede = ?');
                values.push(sede);
            }
            
            if (departamento !== undefined) { // Permitir actualizar incluso si es null
                updates.push('departamento = ?');
                values.push(departamento);
            }
            
            values.push(id); // ID va al final para la cláusula WHERE
            
            const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
            const [result] = await db.query(query, values);
            
            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    static async updatePassword(id, newPassword) {
        try {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            
            const [result] = await db.query(
                'UPDATE users SET password = ? WHERE id = ?',
                [hashedPassword, id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    static async delete(id) {
        try {
            const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    static async validatePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }
}

module.exports = User;