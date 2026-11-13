# SPEC-019 · Cargar muchos cursos sin fatiga

**Estado:** implementada · **Prioridad:** P1 · **Depende de:** SPEC-017 (las importadas alimentan las sugerencias)

## Problema

En el piloto, un coordinador reportó que registrar los cursos de un docente
con muchos cursos es engorroso. En la pestaña **Cursos**:

1. Cada curso es una tarjeta abierta de 12 campos. Con 8–10 cursos la
   página es interminable y no se ve la carga del docente de un vistazo.
2. **Agregar curso** está arriba y el curso nuevo aparece al final: hay que
   bajar a buscarlo.
3. Todo se escribe desde cero, aunque casi todo se repite:
   - el mismo curso en varios grupos (Redes I G1, G2, G3);
   - el mismo curso dictado por otro docente, o en el periodo anterior;
   - jornada, modalidad y programa, que suelen ser iguales en todos los
     cursos del docente.

## Solución

- **Lista plegable.** Cada curso es un `<details>`. Plegado muestra una
  línea: nombre y `Cód. 4623 · Sem 6 · G1 · Diurna · Presencial · 4 h · 3 cr · 35 est.`
  Arrancan abiertos solo los que les faltan datos obligatorios (insignia
  ámbar, "Faltan datos obligatorios"). "Desplegar todos / Plegar todos" en
  el encabezado. Se usa `<details>` y no un botón porque el `fieldset` de
  solo lectura desactiva los botones, y quien revisa también despliega.
- **Duplicar** (en la línea del curso): copia el curso justo debajo, con el
  grupo siguiente y sin estudiantes, lo abre y lleva el foco al grupo.
- **Autocompletar la ficha.** Nombre y código del curso sugieren los cursos
  ya registrados en el programa del curso, en cualquier asignación,
  incluidas las importadas. Al elegir uno se llenan código, pensum,
  semestre, intensidad y créditos, **solo los campos vacíos**: lo escrito a
  mano no se pisa. Grupo, jornada, estudiantes y programa no se copian.
  Lógica pura en `lib/cursos-conocidos.ts`.
- **Agregar curso** hereda del curso anterior el programa, la jornada y la
  modalidad; el curso nuevo aparece abierto, con el cursor en el nombre. Hay
  un segundo **Agregar curso** al final de la lista.
- **Guardar** con errores despliega los cursos afectados y lleva al primero:
  plegados, los errores no se verían.

Sin cambios en el modelo, el cálculo ni lo persistido.

## Criterios de aceptación

- **CA-019.1** Con cursos completos, al abrir la pestaña se ven plegados en
  una línea cada uno; los incompletos, abiertos.
- **CA-019.2** **Duplicar** en un curso de grupo 1 crea, justo debajo, el
  mismo curso en grupo 2, sin estudiantes, abierto y con el foco en el grupo.
  Respeta el máximo de cursos.
- **CA-019.3** Escribir o elegir el nombre de un curso ya registrado en el
  programa llena código, pensum, semestre, intensidad y créditos vacíos, y
  no cambia los que ya tenían valor.
- **CA-019.4** Entre dos registros del mismo curso gana el del periodo más
  reciente, salvo que venga incompleto y el anterior no.
- **CA-019.5** Un curso nuevo trae programa, jornada y modalidad del
  anterior, y queda a la vista con el cursor en el nombre.
- **CA-019.6** Guardar con un curso plegado incompleto lo despliega y lleva
  la vista hasta él.
- **CA-019.7** En solo lectura los cursos se pueden desplegar, pero no
  aparecen Duplicar, Quitar ni Agregar.

## Evidencia

- CA-019.3 y .4, el grupo siguiente y el resumen: `src/lib/verificar-cursos.ts`.
- CA-019.1, .2, .5, .6 y .7: manual, con un docente de 8+ cursos y con una
  asignación aprobada (solo lectura).
