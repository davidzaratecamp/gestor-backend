-- Expandir la columna departamento en workstations para permitir departamentos administrativos
ALTER TABLE workstations MODIFY COLUMN departamento VARCHAR(50);

-- Agregar los nuevos valores permitidos si la columna es ENUM
-- Si la columna era ENUM, cambiarla a VARCHAR para mayor flexibilidad
-- ALTER TABLE workstations MODIFY COLUMN departamento ENUM('obama', 'majority', 'claro', 'cont', 'sel', 'rec', 'fin');