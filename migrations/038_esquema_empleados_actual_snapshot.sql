-- =====================================================================
--  Migracion 038: Snapshot del esquema de gestion de empleados YA APLICADO
--  (equivalente a la migracion 034, pero con CREATE TABLE IF NOT EXISTS
--  en vez de DROP TABLE IF EXISTS + CREATE TABLE).
--
--  Por que existe este archivo si la 034 ya crea estas 32 tablas:
--   * Sirve como documentacion/baseline explicita de "lo que ya esta
--     en base de datos" (pedido del usuario tras comparar contra el
--     Excel fuente en Descargas/DATOS.xlsx).
--   * Es SEGURO de ejecutar en el entorno actual: usa IF NOT EXISTS,
--     por lo que NO borra ni recrea las tablas (la 034 usa DROP TABLE,
--     lo cual destruiria los empleados ya cargados desde el rol
--     recursosHumanos). No usar DROP+CREATE aqui bajo ninguna
--     circunstancia mientras haya datos reales en users_company.
--   * En un entorno nuevo (sin estas tablas), este archivo por si solo
--     deja el esquema identico al que resulta de aplicar la 034.
--
--  Ver claude/modulo recursoshumanos.md para el detalle de la
--  comparacion contra el Excel y el listado de gaps (migracion 039).
-- =====================================================================

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- =====================================================================
--  CATALOGOS
-- =====================================================================

CREATE TABLE IF NOT EXISTS `tipo_identificacion` (
  `idtipo_identificacion` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(60) NOT NULL,
  `codigo` VARCHAR(10) NOT NULL,
  PRIMARY KEY (`idtipo_identificacion`),
  UNIQUE KEY `uq_tipo_identificacion_codigo` (`codigo`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `estado_civil` (
  `idestado_civil` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`idestado_civil`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `grupo_sanguineo` (
  `idgrupo_sanguineo` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(5) NOT NULL,
  PRIMARY KEY (`idgrupo_sanguineo`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `genero` (
  `idgenero` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(30) NOT NULL,
  PRIMARY KEY (`idgenero`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ciudad` (
  `idciudad` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(80) NOT NULL,
  PRIMARY KEY (`idciudad`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `tipo_direccion` (
  `idtipo_direccion` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(30) NOT NULL,
  PRIMARY KEY (`idtipo_direccion`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `parentesco` (
  `idparentesco` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(40) NOT NULL,
  PRIMARY KEY (`idparentesco`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `area` (
  `idarea` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(60) NOT NULL,
  PRIMARY KEY (`idarea`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `centro_costo` (
  `idcentro_costo` INT NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(20) NOT NULL,
  `nombre` VARCHAR(80) NOT NULL,
  PRIMARY KEY (`idcentro_costo`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `cargo` (
  `idcargo` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(80) NOT NULL,
  `codigo_ssff` VARCHAR(45) NULL,
  PRIMARY KEY (`idcargo`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `tipo_contrato` (
  `idtipo_contrato` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`idtipo_contrato`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `estado_contrato` (
  `idestado_contrato` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(30) NOT NULL,   -- activo, periodo_prueba, suspendido, retirado, inactivo
  PRIMARY KEY (`idestado_contrato`),
  UNIQUE KEY `uq_estado_contrato_nombre` (`nombre`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `modalidad` (
  `idmodalidad` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`idmodalidad`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `oleada` (
  `idoleada` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(45) NOT NULL,
  `fecha_inicio` DATE NOT NULL,
  PRIMARY KEY (`idoleada`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `entidad_seguridad_social` (
  `identidad_seguridad_social` INT NOT NULL AUTO_INCREMENT,
  `tipo` VARCHAR(20) NOT NULL,   -- EPS / ARL / AFP / CESANTIAS / CAJA
  `nombre` VARCHAR(80) NOT NULL,
  `codigo` VARCHAR(20) NULL,
  PRIMARY KEY (`identidad_seguridad_social`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `banco` (
  `idbanco` INT NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(10) NULL,
  `nombre` VARCHAR(60) NOT NULL,
  PRIMARY KEY (`idbanco`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `tipo_cuenta` (
  `idtipo_cuenta` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(30) NOT NULL,
  PRIMARY KEY (`idtipo_cuenta`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `tipo_novedad` (
  `idtipo_novedad` INT NOT NULL AUTO_INCREMENT,
  `categoria` VARCHAR(20) NOT NULL,   -- OPERACION / RRHH
  `nombre` VARCHAR(80) NOT NULL,
  PRIMARY KEY (`idtipo_novedad`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `tipo_retiro` (
  `idtipo_retiro` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(40) NOT NULL,
  PRIMARY KEY (`idtipo_retiro`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `motivo_retiro` (
  `idmotivo_retiro` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(80) NOT NULL,
  PRIMARY KEY (`idmotivo_retiro`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `cliente` (
  `idCliente` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(80) NOT NULL,
  `nit` VARCHAR(20) NOT NULL,
  `estado` ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  PRIMARY KEY (`idCliente`),
  UNIQUE KEY `uq_cliente_nit` (`nit`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `campania` (
  `idcampania` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(80) NOT NULL,
  `Cliente_idCliente` INT NOT NULL,
  PRIMARY KEY (`idcampania`),
  CONSTRAINT `fk_campania_cliente`
    FOREIGN KEY (`Cliente_idCliente`) REFERENCES `cliente` (`idCliente`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB;

-- =====================================================================
--  ENTIDAD NUCLEO: EMPLEADO (users_company)
-- =====================================================================

CREATE TABLE IF NOT EXISTS `users_company` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `numero_identificacion` VARCHAR(20) NOT NULL,
  `fecha_expedicion` DATE NULL,
  `primer_nombre` VARCHAR(50) NOT NULL,
  `segundo_nombre` VARCHAR(50) NULL,
  `primer_apellido` VARCHAR(50) NOT NULL,
  `segundo_apellido` VARCHAR(50) NULL,
  `nombre_propio` VARCHAR(200) NULL,
  `fecha_nacimiento` DATE NULL,
  `numero_hijos` INT NOT NULL DEFAULT 0,
  `email` VARCHAR(120) NULL,
  `telefono` VARCHAR(30) NULL,
  `usuario_ssff` VARCHAR(80) NULL,   -- antes tabla ssff (1:1)
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tipo_identificacion_idtipo_identificacion` INT NOT NULL,
  `estado_civil_idestado_civil` INT NULL,
  `grupo_sanguineo_idgrupo_sanguineo` INT NULL,
  `genero_idgenero` INT NULL,
  `ciudad_nacimiento_id` INT NULL,
  `ciudad_expedicion_id` INT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_identificacion`
    (`tipo_identificacion_idtipo_identificacion`, `numero_identificacion`),
  CONSTRAINT `fk_users_tipo_identificacion`
    FOREIGN KEY (`tipo_identificacion_idtipo_identificacion`)
    REFERENCES `tipo_identificacion` (`idtipo_identificacion`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_users_estado_civil`
    FOREIGN KEY (`estado_civil_idestado_civil`) REFERENCES `estado_civil` (`idestado_civil`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_users_grupo_sanguineo`
    FOREIGN KEY (`grupo_sanguineo_idgrupo_sanguineo`) REFERENCES `grupo_sanguineo` (`idgrupo_sanguineo`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_users_genero`
    FOREIGN KEY (`genero_idgenero`) REFERENCES `genero` (`idgenero`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_users_ciudad_nacimiento`
    FOREIGN KEY (`ciudad_nacimiento_id`) REFERENCES `ciudad` (`idciudad`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_users_ciudad_expedicion`
    FOREIGN KEY (`ciudad_expedicion_id`) REFERENCES `ciudad` (`idciudad`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB;

-- direccion es 1:N (apunta al empleado)
CREATE TABLE IF NOT EXISTS `direccion` (
  `iddireccion` INT NOT NULL AUTO_INCREMENT,
  `tipo_direccion_idtipo_direccion` INT NOT NULL,
  `direccion` VARCHAR(150) NOT NULL,
  `barrio` VARCHAR(60) NULL,
  `ciudad_idciudad` INT NULL,
  `es_principal` TINYINT(1) NOT NULL DEFAULT 1,
  `users_company_id` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`iddireccion`),
  CONSTRAINT `fk_direccion_tipo_direccion`
    FOREIGN KEY (`tipo_direccion_idtipo_direccion`) REFERENCES `tipo_direccion` (`idtipo_direccion`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_direccion_ciudad`
    FOREIGN KEY (`ciudad_idciudad`) REFERENCES `ciudad` (`idciudad`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_direccion_users_company`
    FOREIGN KEY (`users_company_id`) REFERENCES `users_company` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

-- =====================================================================
--  RELACION LABORAL: CONTRATO
-- =====================================================================

CREATE TABLE IF NOT EXISTS `contrato` (
  `idcontrato` INT NOT NULL AUTO_INCREMENT,
  `users_company_id` INT NOT NULL,
  `Cliente_idCliente` INT NOT NULL,
  `campania_idcampania` INT NOT NULL,
  `area_idarea` INT NOT NULL,
  `centro_costo_idcentro_costo` INT NOT NULL,
  `cargo_idcargo` INT NOT NULL,
  `tipo_contrato_idtipo_contrato` INT NOT NULL,
  `modalidad_idmodalidad` INT NOT NULL,
  `oleada_idoleada` INT NOT NULL,
  `ciudad_idciudad` INT NOT NULL,
  `estado_contrato_idestado_contrato` INT NOT NULL,   -- antes texto libre
  `jefe_inmediato_id` INT NULL,
  `jefe_area_id` INT NULL,
  `fecha_ingreso` DATE NOT NULL,
  `fecha_fin_periodo_prueba` DATE NULL,
  `fecha_fin_contrato` DATE NULL,
  `observaciones` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idcontrato`),
  CONSTRAINT `fk_contrato_users_company`
    FOREIGN KEY (`users_company_id`) REFERENCES `users_company` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_contrato_cliente`
    FOREIGN KEY (`Cliente_idCliente`) REFERENCES `cliente` (`idCliente`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_contrato_campania`
    FOREIGN KEY (`campania_idcampania`) REFERENCES `campania` (`idcampania`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_contrato_area`
    FOREIGN KEY (`area_idarea`) REFERENCES `area` (`idarea`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_contrato_centro_costo`
    FOREIGN KEY (`centro_costo_idcentro_costo`) REFERENCES `centro_costo` (`idcentro_costo`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_contrato_cargo`
    FOREIGN KEY (`cargo_idcargo`) REFERENCES `cargo` (`idcargo`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_contrato_tipo_contrato`
    FOREIGN KEY (`tipo_contrato_idtipo_contrato`) REFERENCES `tipo_contrato` (`idtipo_contrato`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_contrato_modalidad`
    FOREIGN KEY (`modalidad_idmodalidad`) REFERENCES `modalidad` (`idmodalidad`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_contrato_oleada`
    FOREIGN KEY (`oleada_idoleada`) REFERENCES `oleada` (`idoleada`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_contrato_ciudad`
    FOREIGN KEY (`ciudad_idciudad`) REFERENCES `ciudad` (`idciudad`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_contrato_estado_contrato`
    FOREIGN KEY (`estado_contrato_idestado_contrato`) REFERENCES `estado_contrato` (`idestado_contrato`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_contrato_jefe_inmediato`
    FOREIGN KEY (`jefe_inmediato_id`) REFERENCES `users_company` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_contrato_jefe_area`
    FOREIGN KEY (`jefe_area_id`) REFERENCES `users_company` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB;

-- =====================================================================
--  DATOS RELACIONADOS DEL EMPLEADO
-- =====================================================================

CREATE TABLE IF NOT EXISTS `seguridad_social` (
  `idseguridad_social` INT NOT NULL AUTO_INCREMENT,
  `tipo` VARCHAR(20) NOT NULL,
  `fecha_afiliacion` DATE NOT NULL,
  `tarifa_arl` DECIMAL(8,5) NULL,
  `fecha_inicio` DATE NOT NULL,
  `fecha_fin` DATE NULL,
  `activa` TINYINT(1) NOT NULL DEFAULT 1,
  `users_company_id` INT NOT NULL,
  `entidad_seguridad_social_id` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idseguridad_social`),
  CONSTRAINT `fk_segsocial_users_company`
    FOREIGN KEY (`users_company_id`) REFERENCES `users_company` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_segsocial_entidad`
    FOREIGN KEY (`entidad_seguridad_social_id`)
    REFERENCES `entidad_seguridad_social` (`identidad_seguridad_social`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `cuenta_bancaria` (
  `idcuenta_bancaria` INT NOT NULL AUTO_INCREMENT,
  `numero_cuenta` VARCHAR(34) NOT NULL,
  `verificada` TINYINT(1) NOT NULL DEFAULT 0,
  `activa` TINYINT(1) NOT NULL DEFAULT 1,
  `users_company_id` INT NOT NULL,
  `banco_idbanco` INT NOT NULL,
  `tipo_cuenta_idtipo_cuenta` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idcuenta_bancaria`),
  CONSTRAINT `fk_cuenta_users_company`
    FOREIGN KEY (`users_company_id`) REFERENCES `users_company` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cuenta_banco`
    FOREIGN KEY (`banco_idbanco`) REFERENCES `banco` (`idbanco`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cuenta_tipo_cuenta`
    FOREIGN KEY (`tipo_cuenta_idtipo_cuenta`) REFERENCES `tipo_cuenta` (`idtipo_cuenta`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `contacto_emergencia` (
  `idcontacto_emergencia` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(80) NOT NULL,
  `telefono` VARCHAR(30) NOT NULL,
  `parentesco_idparentesco` INT NOT NULL,
  `users_company_id` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idcontacto_emergencia`),
  CONSTRAINT `fk_contacto_parentesco`
    FOREIGN KEY (`parentesco_idparentesco`) REFERENCES `parentesco` (`idparentesco`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_contacto_users_company`
    FOREIGN KEY (`users_company_id`) REFERENCES `users_company` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `historial_salarial` (
  `idhistorial_salarial` INT NOT NULL AUTO_INCREMENT,
  `salario` DECIMAL(12,2) NOT NULL,
  `bono_no_prestacional` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `bono_cafeteria` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `fecha_vigencia_inicio` DATE NOT NULL,
  `fecha_vigencia_fin` DATE NULL,
  `contrato_idcontrato` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idhistorial_salarial`),
  CONSTRAINT `fk_historial_salarial_contrato`
    FOREIGN KEY (`contrato_idcontrato`) REFERENCES `contrato` (`idcontrato`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

-- Retiro: UNA sola tabla (fusion de retiro + bajas). Un retiro por contrato.
CREATE TABLE IF NOT EXISTS `retiro` (
  `idretiro` INT NOT NULL AUTO_INCREMENT,
  `fecha_retiro` DATE NOT NULL,
  `fecha_ultima_conexion` DATE NULL,
  `fecha_entrega_certificacion` DATE NULL,
  `tipo_retiro_idtipo_retiro` INT NOT NULL,
  `motivo_retiro_idmotivo_retiro` INT NOT NULL,
  `contrato_idcontrato` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idretiro`),
  UNIQUE KEY `uq_retiro_contrato` (`contrato_idcontrato`),   -- 1 retiro por contrato
  CONSTRAINT `fk_retiro_tipo_retiro`
    FOREIGN KEY (`tipo_retiro_idtipo_retiro`) REFERENCES `tipo_retiro` (`idtipo_retiro`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_retiro_motivo_retiro`
    FOREIGN KEY (`motivo_retiro_idmotivo_retiro`) REFERENCES `motivo_retiro` (`idmotivo_retiro`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_retiro_contrato`
    FOREIGN KEY (`contrato_idcontrato`) REFERENCES `contrato` (`idcontrato`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

-- =====================================================================
--  NOVEDADES  (novedad_operacion cubre tambien la asistencia/jornada)
-- =====================================================================

CREATE TABLE IF NOT EXISTS `novedad_operacion` (
  `idnovedad_operacion` INT NOT NULL AUTO_INCREMENT,
  `fecha` DATE NOT NULL,
  `hora_inicio` TIME NULL,
  `hora_fin` TIME NULL,
  `tiempo_almuerzo` TIME NULL,
  `entrada_corregida` TIME NULL,
  `salida_corregida` TIME NULL,
  `almuerzo_corregido` TIME NULL,
  `tipo_novedad_idtipo_novedad` INT NOT NULL,
  `contrato_idcontrato` INT NOT NULL,
  `responsable_id` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idnovedad_operacion`),
  KEY `ix_nov_oper_contrato_fecha` (`contrato_idcontrato`, `fecha`),   -- alto volumen
  CONSTRAINT `fk_nov_oper_tipo_novedad`
    FOREIGN KEY (`tipo_novedad_idtipo_novedad`) REFERENCES `tipo_novedad` (`idtipo_novedad`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_nov_oper_contrato`
    FOREIGN KEY (`contrato_idcontrato`) REFERENCES `contrato` (`idcontrato`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_nov_oper_responsable`
    FOREIGN KEY (`responsable_id`) REFERENCES `users_company` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `novedad_rrhh` (
  `idnovedad_rrhh` INT NOT NULL AUTO_INCREMENT,
  `accidente_transito` TINYINT(1) NOT NULL DEFAULT 0,
  `fecha_inicial` DATE NOT NULL,
  `fecha_final` DATE NULL,
  `fecha_retorno` DATE NULL,
  `total_dias` INT NULL,
  `resumen_diagnostico` TEXT NULL,
  `observaciones` TEXT NULL,
  `fecha_recibido` DATE NULL,
  `tipo_novedad_idtipo_novedad` INT NOT NULL,
  `contrato_idcontrato` INT NOT NULL,
  `responsable_id` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idnovedad_rrhh`),
  KEY `ix_nov_rrhh_contrato_fecha` (`contrato_idcontrato`, `fecha_inicial`),
  CONSTRAINT `fk_nov_rrhh_tipo_novedad`
    FOREIGN KEY (`tipo_novedad_idtipo_novedad`) REFERENCES `tipo_novedad` (`idtipo_novedad`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_nov_rrhh_contrato`
    FOREIGN KEY (`contrato_idcontrato`) REFERENCES `contrato` (`idcontrato`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_nov_rrhh_responsable`
    FOREIGN KEY (`responsable_id`) REFERENCES `users_company` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
