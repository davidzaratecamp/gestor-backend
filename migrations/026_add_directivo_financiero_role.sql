-- Agrega el rol directivoFinanciero al ENUM de usuarios
ALTER TABLE users
  MODIFY COLUMN role ENUM(
    'admin',
    'coordinador',
    'supervisor',
    'technician',
    'jefe_operaciones',
    'administrativo',
    'anonimo',
    'gestorActivos',
    'tecnicoInventario',
    'directivoFinanciero'
  ) NOT NULL;
