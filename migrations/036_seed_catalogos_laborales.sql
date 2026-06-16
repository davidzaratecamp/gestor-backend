-- =====================================================================
--  Migracion: 036_seed_catalogos_laborales
--  Datos semilla de los catalogos laborales requeridos para registrar
--  el contrato, seguridad social, cuenta bancaria, direccion y contacto
--  de emergencia del empleado desde el formulario unico.
--  Complementa la 035 (que sembro identificacion/personales).
-- =====================================================================

-- ============================== UP ===================================

-- ---------------------------------------------------------------------
-- Clientes y campañas (NITs provisionales: actualizar con los reales)
-- ---------------------------------------------------------------------
INSERT INTO `cliente` (`nombre`, `nit`) VALUES
  ('Claro', 'NIT-CLARO'),
  ('Obama', 'NIT-OBAMA'),
  ('Asiste', 'NIT-ASISTE')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

INSERT INTO `campania` (`nombre`, `Cliente_idCliente`) VALUES
  ('Claro',          (SELECT `idCliente` FROM `cliente` WHERE `nit` = 'NIT-CLARO')),
  ('Obama',          (SELECT `idCliente` FROM `cliente` WHERE `nit` = 'NIT-OBAMA')),
  ('Reclutamiento',  (SELECT `idCliente` FROM `cliente` WHERE `nit` = 'NIT-ASISTE'));

-- ---------------------------------------------------------------------
-- Estructura organizacional
-- ---------------------------------------------------------------------
INSERT INTO `area` (`nombre`) VALUES
  ('Operaciones'), ('Administrativa'), ('Tecnología'),
  ('Recursos Humanos'), ('Comercial'), ('Calidad'), ('Formación');

INSERT INTO `centro_costo` (`codigo`, `nombre`) VALUES
  ('CC-001', 'Operación Claro'),
  ('CC-002', 'Operación Obama'),
  ('CC-003', 'Administración'),
  ('CC-004', 'Tecnología'),
  ('CC-005', 'Recursos Humanos');

INSERT INTO `cargo` (`nombre`) VALUES
  ('Agente'), ('Supervisor'), ('Coordinador'), ('Analista'),
  ('Técnico'), ('Diseñador'), ('Administrativo'), ('Jefe de área');

INSERT INTO `modalidad` (`nombre`) VALUES
  ('Presencial'), ('Remoto'), ('Híbrido');

INSERT INTO `oleada` (`nombre`, `fecha_inicio`) VALUES
  ('Oleada inicial', '2026-01-01');

-- ---------------------------------------------------------------------
-- Seguridad social (EPS / ARL / AFP / CESANTIAS / CAJA)
-- ---------------------------------------------------------------------
INSERT INTO `entidad_seguridad_social` (`tipo`, `nombre`) VALUES
  ('EPS', 'EPS Sura'),
  ('EPS', 'Sanitas'),
  ('EPS', 'Nueva EPS'),
  ('EPS', 'Salud Total'),
  ('EPS', 'Compensar EPS'),
  ('EPS', 'Famisanar'),
  ('EPS', 'Coosalud'),
  ('ARL', 'ARL Sura'),
  ('ARL', 'Positiva'),
  ('ARL', 'Colmena Seguros'),
  ('ARL', 'Seguros Bolívar ARL'),
  ('AFP', 'Porvenir'),
  ('AFP', 'Protección'),
  ('AFP', 'Colfondos'),
  ('AFP', 'Skandia'),
  ('AFP', 'Colpensiones'),
  ('CESANTIAS', 'Porvenir Cesantías'),
  ('CESANTIAS', 'Protección Cesantías'),
  ('CESANTIAS', 'Fondo Nacional del Ahorro'),
  ('CAJA', 'Compensar'),
  ('CAJA', 'Colsubsidio'),
  ('CAJA', 'Cafam'),
  ('CAJA', 'Comfama');

-- ---------------------------------------------------------------------
-- Bancario
-- ---------------------------------------------------------------------
INSERT INTO `banco` (`nombre`) VALUES
  ('Bancolombia'), ('Banco de Bogotá'), ('Davivienda'), ('BBVA Colombia'),
  ('Banco de Occidente'), ('Banco Popular'), ('Banco Agrario'),
  ('Banco AV Villas'), ('Scotiabank Colpatria'), ('Itaú'),
  ('Banco Falabella'), ('Banco Caja Social'), ('Nequi'), ('Daviplata'),
  ('Lulo Bank'), ('Nu Colombia');

INSERT INTO `tipo_cuenta` (`nombre`) VALUES
  ('Ahorros'), ('Corriente'), ('Depósito electrónico');

-- ---------------------------------------------------------------------
-- Direccion y contacto de emergencia
-- ---------------------------------------------------------------------
INSERT INTO `tipo_direccion` (`nombre`) VALUES
  ('Residencia'), ('Correspondencia'), ('Laboral');

INSERT INTO `parentesco` (`nombre`) VALUES
  ('Madre'), ('Padre'), ('Hermano(a)'), ('Hijo(a)'), ('Cónyuge'),
  ('Compañero(a)'), ('Abuelo(a)'), ('Tío(a)'), ('Primo(a)'),
  ('Amigo(a)'), ('Otro');

-- ========================= DOWN (rollback) ===========================
-- DELETE FROM `parentesco`;
-- DELETE FROM `tipo_direccion`;
-- DELETE FROM `tipo_cuenta`;
-- DELETE FROM `banco`;
-- DELETE FROM `entidad_seguridad_social`;
-- DELETE FROM `oleada`;
-- DELETE FROM `modalidad`;
-- DELETE FROM `cargo`;
-- DELETE FROM `centro_costo`;
-- DELETE FROM `area`;
-- DELETE FROM `campania`;
-- DELETE FROM `cliente`;
