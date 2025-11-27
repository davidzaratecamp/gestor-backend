const db = require('../config/db');

class Activo {
    static async getAll() {
        try {
            const [rows] = await db.query(`
                SELECT 
                    a.*,
                    u.full_name as created_by_name
                FROM activos a
                LEFT JOIN users u ON a.created_by_id = u.id
                ORDER BY a.created_at DESC
            `);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getById(id) {
        try {
            const [rows] = await db.query(`
                SELECT 
                    a.*,
                    u.full_name as created_by_name
                FROM activos a
                LEFT JOIN users u ON a.created_by_id = u.id
                WHERE a.id = ?
            `, [id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async create(activoData, createdById) {
        try {
            const {
                numero_placa,
                centro_costes,
                ubicacion,
                responsable,
                proveedor,
                valor,
                fecha_compra,
                numero_social,
                poliza,
                aseguradora,
                garantia,
                fecha_vencimiento_garantia,
                orden_compra,
                clasificacion,
                clasificacion_activo_fijo,
                adjunto_archivo
            } = activoData;

            // Validar que si garantia es 'Si', debe tener fecha_vencimiento_garantia
            if (garantia === 'Si' && !fecha_vencimiento_garantia) {
                throw new Error('La fecha de vencimiento de garantía es requerida cuando la garantía es "Sí"');
            }

            // Validar que si garantia es 'No', no debe tener fecha_vencimiento_garantia
            if (garantia === 'No' && fecha_vencimiento_garantia) {
                throw new Error('No debe especificar fecha de vencimiento de garantía cuando la garantía es "No"');
            }

            const [result] = await db.query(`
                INSERT INTO activos (
                    numero_placa, centro_costes, ubicacion, empresa, responsable,
                    proveedor, valor, fecha_compra, numero_social, poliza, aseguradora,
                    garantia, fecha_vencimiento_garantia, orden_compra, clasificacion,
                    clasificacion_activo_fijo, adjunto_archivo, created_by_id
                ) VALUES (?, ?, ?, 'Asiste', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                numero_placa, centro_costes, ubicacion, responsable,
                proveedor, valor || null, fecha_compra, numero_social, poliza, aseguradora,
                garantia, fecha_vencimiento_garantia || null, orden_compra, clasificacion,
                clasificacion_activo_fijo, adjunto_archivo, createdById
            ]);

            return { id: result.insertId, ...activoData };
        } catch (error) {
            throw error;
        }
    }

    static async update(id, activoData) {
        try {
            const {
                numero_placa,
                centro_costes,
                ubicacion,
                responsable,
                proveedor,
                valor,
                fecha_compra,
                numero_social,
                poliza,
                aseguradora,
                garantia,
                fecha_vencimiento_garantia,
                orden_compra,
                clasificacion,
                clasificacion_activo_fijo,
                adjunto_archivo
            } = activoData;

            // Validar que si garantia es 'Si', debe tener fecha_vencimiento_garantia
            if (garantia === 'Si' && !fecha_vencimiento_garantia) {
                throw new Error('La fecha de vencimiento de garantía es requerida cuando la garantía es "Sí"');
            }

            // Validar que si garantia es 'No', no debe tener fecha_vencimiento_garantia
            if (garantia === 'No' && fecha_vencimiento_garantia) {
                throw new Error('No debe especificar fecha de vencimiento de garantía cuando la garantía es "No"');
            }

            const [result] = await db.query(`
                UPDATE activos SET
                    numero_placa = ?, centro_costes = ?, ubicacion = ?, responsable = ?,
                    proveedor = ?, valor = ?, fecha_compra = ?, numero_social = ?, poliza = ?, 
                    aseguradora = ?, garantia = ?, fecha_vencimiento_garantia = ?, 
                    orden_compra = ?, clasificacion = ?, clasificacion_activo_fijo = ?,
                    adjunto_archivo = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                numero_placa, centro_costes, ubicacion, responsable,
                proveedor, valor || null, fecha_compra, numero_social, poliza, aseguradora,
                garantia, fecha_vencimiento_garantia || null, orden_compra, 
                clasificacion, clasificacion_activo_fijo, adjunto_archivo, id
            ]);

            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    static async delete(id) {
        try {
            const [result] = await db.query('DELETE FROM activos WHERE id = ?', [id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    static async getByFilter(filters) {
        try {
            let query = `
                SELECT 
                    a.*,
                    u.full_name as created_by_name
                FROM activos a
                LEFT JOIN users u ON a.created_by_id = u.id
                WHERE 1=1
            `;
            const params = [];

            if (filters.numero_placa) {
                query += ' AND a.numero_placa LIKE ?';
                params.push(`%${filters.numero_placa}%`);
            }

            if (filters.ubicacion) {
                query += ' AND a.ubicacion = ?';
                params.push(filters.ubicacion);
            }

            if (filters.responsable) {
                query += ' AND a.responsable LIKE ?';
                params.push(`%${filters.responsable}%`);
            }

            if (filters.clasificacion) {
                query += ' AND a.clasificacion = ?';
                params.push(filters.clasificacion);
            }

            if (filters.garantia) {
                query += ' AND a.garantia = ?';
                params.push(filters.garantia);
            }

            query += ' ORDER BY a.created_at DESC';

            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getResponsables() {
        try {
            // Por ahora retorna valores fijos, después se puede hacer dinámico
            return [
                'David López'
                // Se pueden agregar más responsables aquí
            ];
        } catch (error) {
            throw error;
        }
    }

    static async getStats() {
        try {
            const [totalRows] = await db.query('SELECT COUNT(*) as total FROM activos');
            const [productivoRows] = await db.query('SELECT COUNT(*) as total FROM activos WHERE clasificacion = "Activo productivo"');
            const [noProductivoRows] = await db.query('SELECT COUNT(*) as total FROM activos WHERE clasificacion = "Activo no productivo"');
            const [conGarantiaRows] = await db.query('SELECT COUNT(*) as total FROM activos WHERE garantia = "Si"');
            const [valorTotalRows] = await db.query('SELECT COALESCE(SUM(valor), 0) as valor_total FROM activos WHERE valor IS NOT NULL');
            const [valorPromedioRows] = await db.query('SELECT COALESCE(AVG(valor), 0) as valor_promedio FROM activos WHERE valor IS NOT NULL');

            return {
                total: totalRows[0].total,
                activos_productivos: productivoRows[0].total,
                activos_no_productivos: noProductivoRows[0].total,
                con_garantia: conGarantiaRows[0].total,
                valor_total: parseFloat(valorTotalRows[0].valor_total),
                valor_promedio: parseFloat(valorPromedioRows[0].valor_promedio)
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Activo;