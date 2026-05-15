-- Migración 026: Agregar estado 'pendiente_baja' al campo estado de activos
-- Permite que tecnicoInventario/gestorActivos soliciten baja al admin sin ejecutarla directamente

ALTER TABLE activos
MODIFY COLUMN estado ENUM(
    'funcional',
    'en_reparacion',
    'dado_de_baja',
    'en_mantenimiento',
    'disponible',
    'asignado',
    'fuera_de_servicio',
    'bodega',
    'pendiente_baja'
) NOT NULL DEFAULT 'funcional' COMMENT 'Estado actual del activo. pendiente_baja = solicitud de baja pendiente de aprobación admin';
