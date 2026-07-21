-- Migración 037: Agregar rol recursosHumanos
-- Reescribe el ENUM completo de users.role (MySQL no permite agregar un solo valor).
-- Incluye directivoFinanciero y disenador, que ya están en uso en producción pero
-- no tenían una migración versionada que los agregara al ENUM.

ALTER TABLE users MODIFY COLUMN role ENUM(
    'admin',
    'supervisor',
    'coordinador',
    'jefe_operaciones',
    'technician',
    'administrativo',
    'anonimo',
    'gestorActivos',
    'tecnicoInventario',
    'directivoFinanciero',
    'disenador',
    'recursosHumanos'
) NOT NULL DEFAULT 'technician';
