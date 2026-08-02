-- El station_code generado para teletrabajo en Bogotá (BOGS1/2-<DEPARTAMENTO>-TELE-XXXXXX)
-- supera casi siempre los 20 caracteres del varchar original, provocando
-- "Data too long for column 'station_code'" al crear la incidencia (falló en
-- producción con el usuario azael.alcala el 2026-08-02). Se amplía la columna
-- para dar espacio suficiente a los departamentos más largos (ej. formacion_obama).
ALTER TABLE workstations
  MODIFY COLUMN station_code VARCHAR(50) NOT NULL;
