-- Expandir enum de departamentos para incluir departamentos administrativos
ALTER TABLE users MODIFY COLUMN departamento 
ENUM('claro','majority','obama','reclutamiento','contratacion','seleccion','area_financiera');

-- También necesitamos expandir workstations para que puedan almacenar estos departamentos
ALTER TABLE workstations MODIFY COLUMN departamento 
ENUM('claro','majority','obama','reclutamiento','contratacion','seleccion','area_financiera');