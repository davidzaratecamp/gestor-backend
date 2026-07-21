-- =====================================================================
--  Migracion 040: Seed de tipo_novedad
--  Estaba vacio desde la migracion 034 (nadie lo sembro en 035/036),
--  lo que bloqueaba por completo poder registrar una novedad_rrhh o
--  novedad_operacion (FK NOT NULL sin ningun valor para elegir).
--  Necesario para el modulo "Consolidado Novedades" del rol RRHH.
-- =====================================================================

INSERT INTO `tipo_novedad` (`categoria`, `nombre`) VALUES
  ('RRHH', 'Incapacidad general'),
  ('RRHH', 'Incapacidad por accidente de transito'),
  ('RRHH', 'Incapacidad por enfermedad laboral'),
  ('RRHH', 'Licencia de maternidad'),
  ('RRHH', 'Licencia de paternidad'),
  ('RRHH', 'Licencia no remunerada'),
  ('RRHH', 'Calamidad domestica'),
  ('RRHH', 'Permiso remunerado'),
  ('OPERACION', 'Tardanza'),
  ('OPERACION', 'Ausentismo'),
  ('OPERACION', 'Hora extra'),
  ('OPERACION', 'Cambio de turno');
