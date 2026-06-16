-- =====================================================================
--  Migracion: 035_seed_catalogos_empleados_y_fk_activos
--  1) Datos semilla de los catalogos requeridos para registrar empleados
--     (la migracion 034 crea las tablas vacias y tipo_identificacion es
--     FK obligatoria en users_company).
--  2) Re-apunta la FK activos.agente_id de la tabla legada `agentes`
--     hacia `users_company` (la 034 recreo users_company, por lo que las
--     asignaciones previas quedan invalidas y se limpian).
-- =====================================================================

-- ============================== UP ===================================

-- ---------------------------------------------------------------------
-- 1. Seeds de catalogos
-- ---------------------------------------------------------------------

INSERT INTO `tipo_identificacion` (`nombre`, `codigo`) VALUES
  ('Cédula de ciudadanía', 'CC'),
  ('Cédula de extranjería', 'CE'),
  ('Pasaporte', 'PA'),
  ('Permiso por protección temporal', 'PPT'),
  ('Tarjeta de identidad', 'TI'),
  ('NIT', 'NIT')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

INSERT INTO `estado_civil` (`nombre`) VALUES
  ('Soltero(a)'),
  ('Casado(a)'),
  ('Unión libre'),
  ('Separado(a)'),
  ('Divorciado(a)'),
  ('Viudo(a)');

INSERT INTO `grupo_sanguineo` (`nombre`) VALUES
  ('O+'), ('O-'), ('A+'), ('A-'), ('B+'), ('B-'), ('AB+'), ('AB-');

INSERT INTO `genero` (`nombre`) VALUES
  ('Masculino'),
  ('Femenino'),
  ('No binario'),
  ('Prefiere no decir');

INSERT INTO `ciudad` (`nombre`) VALUES
  ('Bogotá'), ('Medellín'), ('Cali'), ('Barranquilla'), ('Cartagena'),
  ('Bucaramanga'), ('Cúcuta'), ('Pereira'), ('Manizales'), ('Ibagué'),
  ('Santa Marta'), ('Villavicencio'), ('Pasto'), ('Montería'), ('Neiva'),
  ('Armenia'), ('Popayán'), ('Valledupar'), ('Sincelejo'), ('Tunja');

INSERT INTO `estado_contrato` (`nombre`) VALUES
  ('activo'), ('periodo_prueba'), ('suspendido'), ('retirado'), ('inactivo')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

INSERT INTO `tipo_contrato` (`nombre`) VALUES
  ('Indefinido'),
  ('Fijo'),
  ('Obra o labor'),
  ('Prestación de servicios'),
  ('Aprendizaje');

-- ---------------------------------------------------------------------
-- 2. FK de activos.agente_id hacia users_company
--    Las asignaciones existentes referencian ids de la tabla `agentes`
--    (eliminada del flujo), por lo que se anulan antes de crear la FK.
-- ---------------------------------------------------------------------

ALTER TABLE `activos` DROP FOREIGN KEY `fk_activos_agente`;

UPDATE `activos` SET `agente_id` = NULL WHERE `agente_id` IS NOT NULL;

ALTER TABLE `activos`
  ADD CONSTRAINT `fk_activos_users_company`
  FOREIGN KEY (`agente_id`) REFERENCES `users_company` (`id`)
  ON DELETE SET NULL;

-- ========================= DOWN (rollback) ===========================
-- ALTER TABLE `activos` DROP FOREIGN KEY `fk_activos_users_company`;
-- ALTER TABLE `activos`
--   ADD CONSTRAINT `fk_activos_agente`
--   FOREIGN KEY (`agente_id`) REFERENCES `agentes` (`id`) ON DELETE SET NULL;
-- DELETE FROM `tipo_contrato`;
-- DELETE FROM `estado_contrato`;
-- DELETE FROM `ciudad`;
-- DELETE FROM `genero`;
-- DELETE FROM `grupo_sanguineo`;
-- DELETE FROM `estado_civil`;
-- DELETE FROM `tipo_identificacion`;
