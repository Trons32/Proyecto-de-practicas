/*
  Grupo o bloque de un curso. En distancia y virtual un curso se dicta en
  el bloque 1, en el 2 o en ambos a la vez («BL1-BL2», 7 caracteres): no
  cabía en VARCHAR(5). Se amplía también en la línea base, que copia el
  grupo del curso aprobado.
*/
ALTER TABLE public.curso_asignado   ALTER COLUMN grupo TYPE VARCHAR(10);
ALTER TABLE public.linea_base_curso ALTER COLUMN grupo TYPE VARCHAR(10);
