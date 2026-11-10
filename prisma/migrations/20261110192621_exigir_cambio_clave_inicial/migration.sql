-- SPEC-014: las credenciales temporales son de un solo uso operativo. El
-- coordinador debe reemplazarlas antes de consultar o modificar asignaciones.
ALTER TABLE public.usuario
  ADD COLUMN debe_cambiar_clave BOOLEAN NOT NULL DEFAULT false;

-- Las cuentas locales de coordinador creadas antes de esta regla también
-- recibieron una clave temporal. Se les exige reemplazarla en su próximo acceso.
UPDATE public.usuario
SET debe_cambiar_clave = true
WHERE rol = 'COORDINADOR' AND clave_hash IS NOT NULL;
