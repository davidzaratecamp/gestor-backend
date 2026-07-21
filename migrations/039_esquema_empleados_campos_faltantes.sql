-- =====================================================================
--  Migracion 039: Campos y tablas faltantes en gestion de empleados
--  detectados al comparar el esquema actual (migraciones 034/038)
--  contra las 4 hojas del Excel fuente (Descargas/DATOS.xlsx:
--  TOTAL PERSONAL, CONSOLIDADO NOVEDADES, TRASPASOS, PASIVO VACACIONAL).
--
--  Ver claude/modulo recursoshumanos.md secciones 5 y 6 para el detalle
--  completo de la comparacion campo a campo.
--
--  Normalizacion: todo "tipo_X" con un set fijo de valores se modela
--  como catalogo + FK (mismo patron que tipo_identificacion, genero,
--  modalidad, etc.), NUNCA como texto libre. Las FK a catalogos usan
--  ON DELETE RESTRICT (igual que el resto del esquema, ej.
--  fk_users_ciudad_nacimiento, fk_contrato_area) incluso si la columna
--  es NULL-able, para no perder datos historicos silenciosamente. Las
--  FK que apuntan a users_company representando un ROL de persona
--  (jefe, analista) usan ON DELETE SET NULL, igual que
--  fk_contrato_jefe_inmediato / fk_contrato_jefe_area.
--
--  Ejecutar UNA sola vez sobre una BD que ya tiene aplicadas las
--  migraciones 034-037 (o 038). No usa IF NOT EXISTS en los ALTER
--  TABLE (no es portable a MySQL 5.7/MariaDB antiguos); si se corre
--  dos veces fallara con "Duplicate column name", lo cual es la señal
--  correcta de que ya se aplico.
-- =====================================================================

SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- =====================================================================
--  0) CATALOGOS NUEVOS (requeridos por las tablas de mas abajo)
-- =====================================================================

CREATE TABLE IF NOT EXISTS `tipo_vacuna` (
  `idtipo_vacuna` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(60) NOT NULL,
  PRIMARY KEY (`idtipo_vacuna`),
  UNIQUE KEY `uq_tipo_vacuna_nombre` (`nombre`)
) ENGINE = InnoDB;

INSERT INTO `tipo_vacuna` (`nombre`) VALUES
  ('Pfizer'), ('Moderna'), ('AstraZeneca'), ('Sinovac'), ('Janssen');

CREATE TABLE IF NOT EXISTS `tipo_recurso` (
  `idtipo_recurso` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(30) NOT NULL,
  PRIMARY KEY (`idtipo_recurso`),
  UNIQUE KEY `uq_tipo_recurso_nombre` (`nombre`)
) ENGINE = InnoDB;

INSERT INTO `tipo_recurso` (`nombre`) VALUES
  ('diadema'), ('locker'), ('carnet');

-- =====================================================================
--  1) HOJA "TOTAL PERSONAL" - campos sueltos que faltaban
-- =====================================================================

-- Traslado de EPS/AFP/Cesantias: fecha del traslado y entidad de origen.
-- (hasta ahora el modelo solo cerraba el registro anterior con CURDATE()
-- al cambiar de entidad; no admitia una fecha de traslado historica ni
-- guardaba de que entidad venia el empleado)
ALTER TABLE `seguridad_social`
  ADD COLUMN `fecha_traslado` DATE NULL AFTER `fecha_inicio`,
  ADD COLUMN `entidad_anterior_id` INT NULL AFTER `entidad_seguridad_social_id`;

ALTER TABLE `seguridad_social`
  ADD CONSTRAINT `fk_segsocial_entidad_anterior`
    FOREIGN KEY (`entidad_anterior_id`)
    REFERENCES `entidad_seguridad_social` (`identidad_seguridad_social`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- RUT del empleado (documento tributario)
ALTER TABLE `users_company`
  ADD COLUMN `rut` VARCHAR(20) NULL AFTER `usuario_ssff`;

-- Piso donde labora + analista de RRHH encargado del empleado
ALTER TABLE `contrato`
  ADD COLUMN `piso` VARCHAR(10) NULL AFTER `ciudad_idciudad`,
  ADD COLUMN `analista_encargado_id` INT NULL AFTER `jefe_area_id`;

ALTER TABLE `contrato`
  ADD CONSTRAINT `fk_contrato_analista_encargado`
    FOREIGN KEY (`analista_encargado_id`) REFERENCES `users_company` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Entrega de equipo al momento del retiro (Si/No)
ALTER TABLE `retiro`
  ADD COLUMN `equipo_entregado` TINYINT(1) NOT NULL DEFAULT 0 AFTER `fecha_entrega_certificacion`;

-- Vacunacion COVID-19 (1 registro por empleado)
CREATE TABLE IF NOT EXISTS `vacunacion_covid` (
  `idvacunacion_covid` INT NOT NULL AUTO_INCREMENT,
  `primera_dosis_fecha` DATE NULL,
  `segunda_dosis_fecha` DATE NULL,
  `users_company_id` INT NOT NULL,
  `tipo_vacuna_idtipo_vacuna` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idvacunacion_covid`),
  UNIQUE KEY `uq_vacunacion_users_company` (`users_company_id`),
  CONSTRAINT `fk_vacunacion_users_company`
    FOREIGN KEY (`users_company_id`) REFERENCES `users_company` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_vacunacion_tipo_vacuna`
    FOREIGN KEY (`tipo_vacuna_idtipo_vacuna`) REFERENCES `tipo_vacuna` (`idtipo_vacuna`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB;

-- Dotacion (uniformes): historico de entregas por empleado
CREATE TABLE IF NOT EXISTS `dotacion` (
  `iddotacion` INT NOT NULL AUTO_INCREMENT,
  `talla_camisa` VARCHAR(10) NULL,
  `talla_pantalon` VARCHAR(10) NULL,
  `talla_calzado` VARCHAR(10) NULL,
  `fecha_entrega` DATE NULL,
  `observaciones` VARCHAR(255) NULL,
  `users_company_id` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`iddotacion`),
  CONSTRAINT `fk_dotacion_users_company`
    FOREIGN KEY (`users_company_id`) REFERENCES `users_company` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

-- Recursos fisicos asignados al empleado: diadema, locker, carnet.
CREATE TABLE IF NOT EXISTS `asignacion_recurso` (
  `idasignacion_recurso` INT NOT NULL AUTO_INCREMENT,
  `identificador` VARCHAR(60) NULL,      -- serial de diadema, numero de locker, numero de carnet
  `fecha_entrega` DATE NULL,
  `fecha_devolucion` DATE NULL,
  `activa` TINYINT(1) NOT NULL DEFAULT 1,
  `observaciones` VARCHAR(255) NULL,
  `users_company_id` INT NOT NULL,
  `tipo_recurso_idtipo_recurso` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idasignacion_recurso`),
  CONSTRAINT `fk_asignacion_recurso_users_company`
    FOREIGN KEY (`users_company_id`) REFERENCES `users_company` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_asignacion_recurso_tipo_recurso`
    FOREIGN KEY (`tipo_recurso_idtipo_recurso`) REFERENCES `tipo_recurso` (`idtipo_recurso`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB;

-- =====================================================================
--  2) HOJA "CONSOLIDADO NOVEDADES" - flags documentales faltantes
-- =====================================================================

ALTER TABLE `novedad_rrhh`
  ADD COLUMN `fecha_reporte` DATE NULL AFTER `fecha_recibido`,
  ADD COLUMN `origen_incapacidad` VARCHAR(100) NULL AFTER `resumen_diagnostico`,
  ADD COLUMN `tiene_documento_original` TINYINT(1) NOT NULL DEFAULT 0 AFTER `fecha_reporte`,
  ADD COLUMN `tiene_copia_documento` TINYINT(1) NOT NULL DEFAULT 0 AFTER `tiene_documento_original`,
  ADD COLUMN `tiene_historia_clinica` TINYINT(1) NOT NULL DEFAULT 0 AFTER `tiene_copia_documento`,
  ADD COLUMN `tiene_runt` TINYINT(1) NOT NULL DEFAULT 0 AFTER `tiene_historia_clinica`,
  ADD COLUMN `tiene_furips` TINYINT(1) NOT NULL DEFAULT 0 AFTER `tiene_runt`,
  ADD COLUMN `tiene_soat` TINYINT(1) NOT NULL DEFAULT 0 AFTER `tiene_furips`;

-- =====================================================================
--  3) HOJA "TRASPASOS" - sin tabla dedicada, se crea desde cero
--     Guarda el estado "anterior" y "nuevo" de un cambio de contrato
--     (area/cargo/campania/centro de costo/salario/modalidad), mas los
--     campos propios del traspaso (trabajo en casa, diadema, equipo,
--     ratificacion).
-- =====================================================================

CREATE TABLE IF NOT EXISTS `traspaso` (
  `idtraspaso` INT NOT NULL AUTO_INCREMENT,
  `contrato_idcontrato` INT NOT NULL,
  `estado` VARCHAR(30) NULL,
  `fecha_inicio` DATE NOT NULL,
  `fecha_fin` DATE NULL,
  `ratificacion` TINYINT(1) NOT NULL DEFAULT 0,
  `observaciones` VARCHAR(255) NULL,

  -- estado ANTERIOR (snapshot al momento del traspaso)
  `area_anterior_id` INT NULL,
  `campania_anterior_id` INT NULL,
  `centro_costo_anterior_id` INT NULL,
  `cargo_anterior_id` INT NULL,
  `cargo_ssff_anterior` VARCHAR(45) NULL,
  `usuario_ssff_anterior` VARCHAR(80) NULL,
  `salario_anterior` DECIMAL(12,2) NULL,
  `bono_no_prestacional_anterior` DECIMAL(12,2) NULL,
  `bono_cafeteria_anterior` DECIMAL(12,2) NULL,
  `jefe_area_anterior_id` INT NULL,
  `jefe_inmediato_anterior_id` INT NULL,

  -- estado NUEVO
  `area_nueva_id` INT NULL,
  `campania_nueva_id` INT NULL,
  `centro_costo_nuevo_id` INT NULL,
  `cargo_nuevo_id` INT NULL,
  `cargo_ssff_nuevo` VARCHAR(45) NULL,
  `usuario_ssff_nuevo` VARCHAR(80) NULL,
  `salario_nuevo` DECIMAL(12,2) NULL,
  `bono_no_prestacional_nuevo` DECIMAL(12,2) NULL,
  `bono_cafeteria_nuevo` DECIMAL(12,2) NULL,
  `jefe_area_nuevo_id` INT NULL,
  `jefe_inmediato_nuevo_id` INT NULL,
  `modalidad_idmodalidad` INT NULL,

  -- trabajo en casa / recursos asociados al traspaso
  `fecha_inicio_trabajo_casa` DATE NULL,
  `fecha_fin_trabajo_casa` DATE NULL,
  `diadema` VARCHAR(60) NULL,
  `equipo_computo` VARCHAR(60) NULL,

  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idtraspaso`),
  KEY `ix_traspaso_contrato_fecha` (`contrato_idcontrato`, `fecha_inicio`),

  CONSTRAINT `fk_traspaso_contrato`
    FOREIGN KEY (`contrato_idcontrato`) REFERENCES `contrato` (`idcontrato`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `fk_traspaso_area_anterior`
    FOREIGN KEY (`area_anterior_id`) REFERENCES `area` (`idarea`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_traspaso_campania_anterior`
    FOREIGN KEY (`campania_anterior_id`) REFERENCES `campania` (`idcampania`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_traspaso_centro_costo_anterior`
    FOREIGN KEY (`centro_costo_anterior_id`) REFERENCES `centro_costo` (`idcentro_costo`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_traspaso_cargo_anterior`
    FOREIGN KEY (`cargo_anterior_id`) REFERENCES `cargo` (`idcargo`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_traspaso_jefe_area_anterior`
    FOREIGN KEY (`jefe_area_anterior_id`) REFERENCES `users_company` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_traspaso_jefe_inmediato_anterior`
    FOREIGN KEY (`jefe_inmediato_anterior_id`) REFERENCES `users_company` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT `fk_traspaso_area_nueva`
    FOREIGN KEY (`area_nueva_id`) REFERENCES `area` (`idarea`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_traspaso_campania_nueva`
    FOREIGN KEY (`campania_nueva_id`) REFERENCES `campania` (`idcampania`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_traspaso_centro_costo_nuevo`
    FOREIGN KEY (`centro_costo_nuevo_id`) REFERENCES `centro_costo` (`idcentro_costo`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_traspaso_cargo_nuevo`
    FOREIGN KEY (`cargo_nuevo_id`) REFERENCES `cargo` (`idcargo`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_traspaso_jefe_area_nuevo`
    FOREIGN KEY (`jefe_area_nuevo_id`) REFERENCES `users_company` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_traspaso_jefe_inmediato_nuevo`
    FOREIGN KEY (`jefe_inmediato_nuevo_id`) REFERENCES `users_company` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_traspaso_modalidad`
    FOREIGN KEY (`modalidad_idmodalidad`) REFERENCES `modalidad` (`idmodalidad`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB;

-- =====================================================================
--  4) HOJA "PASIVO VACACIONAL" - sin tabla, se crea desde cero
--     'vacaciones' guarda el corte (dias trabajados/acumulados/tomados/
--     compensados + pasivo); 'periodo_vacacional' normaliza los ~10
--     grupos repetidos de (Periodo Tomado, Fecha Inicio, Fecha Final)
--     del Excel en filas 1:N en vez de columnas repetidas.
-- =====================================================================

CREATE TABLE IF NOT EXISTS `vacaciones` (
  `idvacaciones` INT NOT NULL AUTO_INCREMENT,
  `contrato_idcontrato` INT NOT NULL,
  `fecha_corte` DATE NOT NULL,
  `dias_trabajados` INT NOT NULL DEFAULT 0,
  `dias_acumulados` DECIMAL(6,2) NOT NULL DEFAULT 0,
  `dias_tomados` DECIMAL(6,2) NOT NULL DEFAULT 0,
  `dias_compensados` DECIMAL(6,2) NOT NULL DEFAULT 0,
  `pasivo_vacacional` DECIMAL(12,2) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idvacaciones`),
  KEY `ix_vacaciones_contrato_fecha` (`contrato_idcontrato`, `fecha_corte`),
  CONSTRAINT `fk_vacaciones_contrato`
    FOREIGN KEY (`contrato_idcontrato`) REFERENCES `contrato` (`idcontrato`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `periodo_vacacional` (
  `idperiodo_vacacional` INT NOT NULL AUTO_INCREMENT,
  `vacaciones_idvacaciones` INT NOT NULL,
  `periodo_tomado` VARCHAR(45) NULL,
  `fecha_inicio` DATE NOT NULL,
  `fecha_final` DATE NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idperiodo_vacacional`),
  CONSTRAINT `fk_periodo_vacacional_vacaciones`
    FOREIGN KEY (`vacaciones_idvacaciones`) REFERENCES `vacaciones` (`idvacaciones`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
