-- SPEC-014: la clave nunca se guarda en texto plano. El hash queda separado
-- de la sesión; una cookie firmada no permite reconstruir la contraseña.
ALTER TABLE public.usuario
  ADD COLUMN clave_hash VARCHAR(255) NULL,
  ADD COLUMN clave_actualizada TIMESTAMPTZ NULL;
