# SPEC-021 · Directorio de docentes: buscar por cédula o código

**Estado:** implementada · listado cargado el 2026-11-13 (1.638 docentes) · **Prioridad:** P1 · **Depende de:** SPEC-011, SPEC-017

## Problema

Al registrar un docente en una asignación, el coordinador escribe todo a
mano: cédula, nombre completo, nivel de formación, contrato, dedicación,
categoría, sede… aunque el docente ya trabaja en la universidad y, muchas
veces, ya apareció en una asignación anterior. La jefatura entregó el
listado institucional (`LISTADO DOCENTES CODIFICADO.xlsx`) para cargarlo en
la base y que, al escribir la cédula o el código, el sistema traiga los
datos.

## Lo que trae el listado

Una hoja, 1.930 filas, cuatro columnas:

| Columna | Ejemplo | Uso |
| --- | --- | --- |
| `CODIGO` | `DOC0001649` | código institucional; se busca por él |
| `NOMBRE_CODIFICADO` | `DOCENTE 1649` | alias anónimo; se deriva del código, no se guarda |
| `NUM_IDENTIFICACION_ANT` | cédula | se busca por ella; llave de la persona |
| `NOM_LARGO_ANT` | `ABAD LOPEZ FERNANDO VALENTIN` | nombre completo, **apellidos primero** |

**Solo trae identidad (código, cédula y nombre).** Nivel de formación,
contrato, dedicación, categoría, sede, MinCiencias y perfil **no están**:
esos salen de la última asignación en la que aparezca el docente
(`docente_asignado`), incluidas las importadas de periodos anteriores
(SPEC-017). Esa combinación es lo que hace que registrar sea rápido.

### Calidad (conteos, sin datos personales)

| Hallazgo | Filas | Qué se hace |
| --- | --- | --- |
| Sin cédula ni nombre (solo código) | 216 | No se cargan: no hay a quién buscar |
| Cédula de 2 dígitos | 67 | No se cargan: la base exige 6 o más dígitos (`ck_docente_documento`) |
| Cédula no numérica (`FV…`) | 1 | No se carga por la misma regla; queda en el informe |
| Cédula repetida con códigos distintos | 4 | Se carga la persona una vez; los códigos en conflicto van al informe para decidir |
| Código repetido | 1 | Al informe |
| Código sin prefijo `DOC` (10 dígitos) | 2 | Se cargan tal cual |
| Nombre con espacios dobles | 395 | Se normalizan a uno |
| Nombre en minúsculas | 11 | Se pasan a mayúsculas, como exige el formato |

Quedan unas **1.640 personas válidas**.

## Solución propuesta

### 1. Base: la tabla `docente` ya es el directorio

`public.docente` (documento único + nombres) existe desde la migración
inicial y hoy solo se llena al **entregar** una asignación
(`escribir.ts`). Una migración nueva le agrega:

- `codigo VARCHAR(12) NULL UNIQUE`: el código institucional.
- `origen VARCHAR(12) NOT NULL DEFAULT 'asignacion'` con
  `CHECK (origen IN ('asignacion', 'listado'))`: de dónde salió la persona.
- `actualizado TIMESTAMPTZ`: la última carga del listado que la tocó.

Sin tabla nueva: la persona es la misma, venga del listado o de una
asignación, y `docente_asignado.docente_id` ya apunta a ella. Los permisos
siguen el patrón de las demás tablas (`rol_asignacion_app`).

### 2. Carga: desde la aplicación, repetible

El listado va a cambiar cada semestre, así que la carga no es un script de
una sola vez: es una pantalla del administrador,
`/admin/datos/docentes`, con el mismo patrón que la importación de Excel
(SPEC-017):

1. Sube el `.xlsx`. Se lee **en el navegador** con `exceljs` bajo demanda
   (`lib/importar-docentes/`, puro y probado).
2. Ve una **vista previa** con conteos: nuevos, con nombre o código
   actualizado, sin cambios, descartados (con el motivo) y conflictos.
3. Confirma, y `POST /api/docentes/importar` (solo `ADMIN`) hace un
   `upsert` por cédula en una transacción.

Reglas del `upsert`:

- **Llave: la cédula.** Una persona que ya existe por una asignación
  conserva su `id` (y con él su historial); se le agrega el código.
- **No se borra a nadie** que no venga en el listado: puede seguir en
  asignaciones viejas.
- Las cédulas con conflicto de código no se tocan hasta que el
  administrador decida.

### 3. Búsqueda: una a la vez, nunca el directorio entero

`GET /api/docentes/buscar?q=…` con sesión, de cualquier rol:

- `q` de 6 o más dígitos → por cédula exacta.
- `q` como `DOC0001649` (o `1649`) → por código exacto.
- `q` de 4 o más letras → por nombre, máximo 8 resultados.

Devuelve la persona (código, cédula, nombre) y su **última ficha
conocida**: los datos del `docente_asignado` más reciente, con su periodo y
programa. No hay endpoint que devuelva el listado completo, ni se mete en
los stores: serían 1.640 cédulas viajando a cada navegador. Las cédulas son
datos personales (Ley 1581 de 2012): se consultan de a una, quien las
necesita.

### 4. En el formulario del docente

> **Revisión del 2026-11-13 (coordinación):** sin caja de búsqueda aparte.
> Lo hace el propio campo **Número de documento** (`lib/usar-directorio.ts`);
> debajo, una línea dice «Buscando…», «Encontrado en el directorio: se
> cargaron sus datos», «En el directorio: NOMBRE · Usar sus datos» (si la
> ficha ya tenía nombre) o «No está en el directorio: complete los datos a
> mano». La búsqueda por código o nombre queda solo en la API.
>
> **Autocompletado (2026-11-13):** las sugerencias aparecen **mientras se
> escribe**, no al terminar. Al cuarto dígito se pide un lote de hasta 30
> cédulas que empiezan así (`modo=prefijo`, `sugerirPorCedula`); cada dígito
> siguiente lo filtra en el navegador, sin red. Solo si el lote vino lleno
> se pide otro más específico, tras 150 ms (debounce) y cancelando el
> anterior. Se muestran 8, con nombre y código. El llenado automático
> espera 600 ms sin teclear: una cédula corta puede ser el comienzo de la
> que se escribe. Las sugerencias no traen la última ficha; se pide al elegir. Elegir una
> reemplaza cédula y nombre (puede ser otra persona) y completa lo vacío.
> Teclado: ↑ ↓, Enter, Esc.

En **Número de documento** (pestaña Docente):

- Al escribir una cédula completa o un código, se busca solo (con una
  pausa de 400 ms, no en cada tecla).
- Si existe, aparece una tarjeta debajo:
  `ABAD LOPEZ FERNANDO VALENTIN · DOC0001649 · última asignación 2026-1, Ingeniería de Sistemas · [Usar estos datos]`.
- **Usar estos datos** llena **solo los campos vacíos**, como el
  autocompletado de cursos (SPEC-019). Las horas, cursos y descargas no se
  copian: son de cada periodo.
- Si la cédula ya está en esta asignación, lo avisa antes de duplicarla.
- Si no existe, no pasa nada: se registra a mano, como hoy.
- **Si la ficha aún no tiene nombre**, los datos se llenan solos al
  encontrar la cédula, sin pulsar el botón (pedido de la jefatura, 2026-11-13).
  Con nombre ya escrito, solo se sugiere.

## Criterios de aceptación

- **CA-021.1** Cargar el listado deja en `docente` las ~1.640 personas
  válidas con su código. Cargarlo dos veces no crea duplicados ni cambia
  nada la segunda vez.
- **CA-021.2** Una persona creada antes por una asignación conserva su `id`
  y recibe el código.
- **CA-021.3** Las filas sin cédula, con cédula inválida o en conflicto no
  se cargan, y la vista previa las cuenta con su motivo.
- **CA-021.4** Escribir una cédula o un código conocidos en el formulario
  muestra la tarjeta en menos de un segundo. **Usar estos datos** llena lo
  vacío y no pisa lo escrito.
- **CA-021.5** Si el docente estuvo en una asignación anterior, la tarjeta
  trae también contrato, dedicación, categoría, sede, nivel de formación y
  MinCiencias de la más reciente.
- **CA-021.6** No existe forma de obtener el directorio entero desde el
  navegador. La búsqueda por nombre devuelve como máximo 8 resultados.
- **CA-021.7** Solo el administrador carga el listado.

## Decisiones (2026-11-13)

- **Nombre:** se conserva el que la persona ya tenga por una asignación
  entregada; el del listado (apellidos primero) solo se usa para quien no
  tiene. `docente.origen` registra quién puso el nombre vigente, y una
  entrega lo pasa a `asignacion` (`escribir.ts`).
- **Código en reportes:** no. Los reportes siguen mostrando el nombre.
- **Conflictos de código:** fuera de la carga hasta que Talento Humano
  decida. En el listado de 2026-11 son 3 cédulas válidas con dos códigos
  (6 filas) y 1 código en dos cédulas (2 filas); las otras "cédulas con
  dos códigos" del primer análisis eran cédulas de 2 dígitos, que se
  descartan igual.
- Con el listado de 2026-11: 1.930 filas, **1.638 docentes cargables**,
  216 sin cédula ni nombre y 68 con cédula inválida.

## Evidencia

- Lectura, depuración, búsqueda y completar: `src/lib/verificar-directorio.ts`
  (también contra el listado real, solo con conteos).
- CA-021.1 y .2: `db/cargar-listado-docentes.ts` en vista previa antes y
  después de aplicar (la segunda vez: 0 nuevos, 0 actualizados).
- CA-021.4 a .7: manual, con los dos roles.

## Decisiones abiertas (planteadas a la jefatura)

1. **Orden del nombre.** El listado trae apellidos primero (`ABAD LOPEZ
   FERNANDO VALENTIN`); la ficha y el formato oficial usan nombres primero
   (`DAIRO ALFONSO ALVAREZ PRIETO`). Partirlo automáticamente falla con
   apellidos compuestos ("DE LA HOZ", "DEL CASTILLO"). Opciones:
   a. Guardar y mostrar como viene el listado: el nombre institucional
      manda.
   b. Si la persona ya tiene nombre de una asignación, conservar ese; si
      no, usar el del listado.
2. **¿El código va en los reportes?** El listado se llama *codificado* y
   trae `DOCENTE 1649`: si la idea es que los reportes muestren el código
   en vez del nombre, es otra spec, porque cambia la forma del docente
   guardado en cada asignación.
3. **Las 4 cédulas con dos códigos**: ¿cuál vale? Lo tiene que decir
   Talento Humano; mientras tanto, se dejan fuera.
