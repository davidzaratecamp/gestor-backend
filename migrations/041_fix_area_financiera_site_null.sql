-- Corrige los puestos de Área Financiera (BOG-AF01..08): deben tener site = NULL
-- según el diseño original (migración 028), pero en producción quedaron con
-- site = 'site2', lo que hacía que el catálogo (WHERE site IS NULL) nunca
-- los devolviera y el selector de puestos apareciera vacío.
UPDATE workstations
SET site = NULL
WHERE departamento = 'area_financiera' AND site IS NOT NULL;
