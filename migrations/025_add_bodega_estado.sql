-- Migración 025: Agregar estado 'bodega' al campo estado de activos
-- Descripción: Permite marcar activos como en bodega (almacén/depósito)

ALTER TABLE activos
MODIFY COLUMN estado ENUM(
    'funcional',
    'en_reparacion',
    'dado_de_baja',
    'en_mantenimiento',
    'disponible',
    'asignado',
    'fuera_de_servicio',
    'bodega'
) NOT NULL DEFAULT 'funcional' COMMENT 'Estado actual del activo';
