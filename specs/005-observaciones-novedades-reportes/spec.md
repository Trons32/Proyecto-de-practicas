# SPEC-005 · Observaciones, novedades y cuadro resumen

**Estado:** parcial (ver cada parte) · **Prioridad:** P1

Tres cambios pedidos juntos por el cliente:

| Parte | Qué                                               | Tipo       | Estado                          |
| ----- | ------------------------------------------------- | ---------- | ------------------------------- |
| A     | Los toasts se veían por detrás de los modales     | Corrección | Implementada                    |
| B     | Observaciones y novedades: separar los conceptos   | Corrección | Borrador, a validar con cliente |
| C     | Reportes: cuadro resumen del consolidado           | Nueva      | Implementada (pantalla, comparativo y .xlsx) |
| D     | Reportes: asignación en formato oficial (R1)       | Nueva      | Implementada                    |

---

## A · Toasts siempre por encima

### Problema

Los avisos de error y de confirmación (sileo) quedaban tapados cuando había un
modal abierto. Justo es cuando más se necesitan: el error de un formulario
dentro de un modal no se veía.

Causa: sileo fija `z-index: 50` en `[data-sileo-viewport]` y `Modal` usa
`z-[9999]`. Además sileo inyecta su hoja en runtime, sin orden garantizado
frente a `globals.css`.

### Solución

`globals.css` declara `:root [data-sileo-viewport] { z-index: 10000 }`. El
`:root` sube la especificidad para ganar sin depender del orden de carga.

### Criterios de aceptación

- **CA-005.A1** Dado un modal abierto, cuando se dispara un toast de error,
  entonces el toast se ve encima del modal y de su fondo oscurecido.
- **CA-005.A2** Igual con un toast de éxito (confirmación).

### Evidencia

- `src/app/globals.css` — regla `[data-sileo-viewport]`.
- Prueba manual: en `/admin/parametros`, abrir "Revisar y aplicar" e intentar
  aplicar sin motivo.

---

## B · Observaciones y novedades

**Borrador.** No se implementa hasta que el cliente responda las preguntas
abiertas: cambia la forma del estado persistido (`novedades` v1) y el esquema
SQL.

### Problema

Lo que hoy se llama "novedad" (SPEC-003) está mal nombrado. Hoy una novedad es
un cambio de parámetros del administrador con las asignaciones aprobadas que
afecta. El cliente distingue dos cosas distintas:

| Concepto        | Cuándo                                                                 | Sobre qué                     |
| --------------- | ---------------------------------------------------------------------- | ----------------------------- |
| **Observación** | Mientras la convocatoria está abierta y la asignación está en revisión | Una asignación (o un docente) |
| **Novedad**     | **Después** de aprobada, en cualquier momento del semestre             | Una asignación aprobada       |

- Una **observación** es lo que el administrador le señala al coordinador antes
  de aprobar: "falta la categoría de X", "este docente pasa de 40 h". El
  coordinador la atiende, corrige y reenvía. Hoy eso se hace con la nota de la
  devolución, en texto libre y sin poder marcar cada punto como atendido.
- Una **novedad** es un cambio en la carga ya aprobada durante el semestre: un
  docente que se retira, otro que entra a reemplazarlo, un curso que se fusiona.
  El consolidado en Excel ya lo registra en cada hoja de programa, en la tabla
  **DOCENTES SALIENTES** (nombre, dedicación, motivo) y **DOCENTES NUEVOS**
  (nombre, dedicación, *reemplaza a*). Ejemplo real de Ingeniería de Sistemas:
  *"Los cursos fueron fusionados y asume un docente T.C."*. El libro además
  trae la hoja **VARIACIONES** ("Síntesis variación asignación académica
  2025-2"): facultad, programa, docente, dedicación y descripción —*renuncia*,
  *reingreso*, *pasa de cátedra a TC*, *asume coordinación académica*,
  *reducción de grupos en la proyección*—. Es el reporte natural de las
  novedades del periodo.

### Propuesta

1. **Observaciones** (sustituye la nota libre de la devolución):
   - el administrador las crea sobre una asignación `enviada` o `en_revision`,
     opcionalmente sobre un docente concreto;
   - devolver exige al menos una observación abierta;
   - el coordinador ve las observaciones en su asignación y en la ficha del
     docente, y marca cada una como atendida con una respuesta;
   - append-only, como la bitácora: se puede responder y cerrar, no editar ni
     borrar.
2. **Cambios de parámetros**: lo que hoy hace `/admin/novedades` (antes →
   después, foto de impacto, decisión de pedir corrección) se conserva como
   **historial de parámetros**. Pedir corrección a una afectada crea una
   observación sobre ella en vez de una nota suelta.
3. **Novedades** (nuevo):
   - solo sobre asignaciones `aprobada`;
   - tipos iniciales: *retiro de docente* (motivo), *ingreso de docente*
     (reemplaza a), *cambio de carga* (cursos u horas), *cambio de vinculación*
     (contrato, dedicación o categoría);
   - la asignación aprobada no se reabre: la novedad queda registrada con su
     fecha de efecto, y los reportes pueden mostrar la carga "aprobada" y la
     "vigente con novedades";
   - append-only.

### Preguntas abiertas

- ¿Quién registra la novedad: el coordinador (y la aprueba el administrador) o
  directamente el administrador?
- ¿Una novedad modifica la asignación aprobada (con nueva versión) o solo se
  registra al lado? Del lado de los reportes cambia mucho.
- ¿Las observaciones solo las crea el administrador, o también el decano u
  otro revisor?
- ¿Se pueden crear observaciones con la convocatoria cerrada (sobre una
  asignación en revisión), o solo mientras está abierta?
- ¿Las novedades deben verse en el cuadro resumen (por ejemplo, "docentes
  salientes" y "docentes nuevos" del periodo)?
- ¿Hace falta notificar al coordinador de una observación nueva?

---

## C · Cuadro resumen

### Problema

El consolidado `CONSOLIDADO ASIGNACIÓN ACADÉMICA 2025-para revisión.xlsx` tiene
una hoja por programa y, al frente, el **CUADRO RESUMEN**, que suma a mano la
celda de cada hoja (`=SUM(DERECHO!D67+'ADMON EMPRESAS PRESENCIAL '!D82+…)`).
Cada hoja nueva o fila corrida obliga a reescribir la fórmula.

### Solución

`cuadroResumen(asignaciones, config)` en `src/lib/reportes.ts` (puro) y la
pantalla `/admin/reportes/cuadro-resumen`, con dos vistas —el periodo y el
comparativo con los tres anteriores— y descarga en `.xlsx`.

**Columnas** (una por dedicación): TC, Medio tiempo, Catedrático, **Hora
labor**, Tutor a distancia, Tutor virtual, Total.

**Filas**, en los cuatro bloques del Excel:

| Fila                                       | Origen en el Excel (por docente)     | Aquí                                        |
| ------------------------------------------ | ------------------------------------ | ------------------------------------------- |
| Total docentes                             | `COUNTIF(L, dedicación)`             | docentes de esa dedicación                  |
| Docencia directa                           | `Z` = Σ horas de clase               | `totales.horasClase`                        |
| Preparación / Atención / Comunidades       | `AH`, `AI`, `AJ`                     | campos del docente                          |
| Dedicación total función docencia          | `AM`                                 | `totales.docencia`                          |
| Descargas de investigación                 | `JR` (roles de las descargas)        | descargas con rol tipo INVESTIGACION        |
| Horas complementarias para investigación   | `JS` (roles complementarios)         | administrativas con rol tipo INVESTIGACION  |
| Total horas de investigación               | `JR + JS`                            | `totales.investigacion`                     |
| Extensión directa / administrativa / total | `JT`, `JU`, `JT + JU`                | ídem con EXTENSION; `totales.extension`     |
| Nivel de formación                         | `COUNTIFS(G, nivel, L, dedicación)`  | `nivelFormacion`                            |
| Tipo de contrato                           | `COUNTIFS(N, contrato, L, ded.)`     | `tipoContrato` (ver reglas)                 |
| Categoría en el escalafón                  | `COUNTIFS(O, categoría, L, ded.)`    | `categoria`                                 |

### Reglas

- **Por defecto solo cuentan las aprobadas.** El filtro "Asignaciones" permite
  incluir las entregadas o todas para seguir la convocatoria antes del cierre;
  la pantalla avisa que esas cifras pueden cambiar.
- Filtros: periodo, facultad, programa. Elegir facultad limpia el programa.
- **Investigación y extensión se clasifican por el `tipo` del rol**, no por el
  nombre. El Excel compara nombres contra listas escritas a mano en cada
  fórmula, y las listas no coinciden entre columnas (`AO` dice "DIRECTOR DE
  INVESTIGACIÓN", `JR` dice "DIRECTOR DE GRUPO DE INVESTIGACIÓN"). Así el cuadro
  no puede contradecir la ficha del docente.
- **Hora labor tiene columna propia.** El Excel cuenta por dedicación con
  `COUNTIF` sobre cinco valores; un docente `HORA_LABOR` —que el formato 2026
  ofrece— no caía en ninguno y desaparecía del consolidado. Misma razón que los
  roles reclasificados.
- **Tipo de contrato:** el Excel separa "término fijo a un año" de "inferior a
  un año", pero el formato de asignación solo registra `TÉRMINO_FIJO`; se
  muestra una sola fila "Término fijo". "Labor contratada (tutores y cátedra)"
  agrupa `LABOR_CONTRATADA`, `CÁTEDRAS`, `TUTOR_VIRTUAL` y `TUTOR_EAD`.
- **Docente en formación** se conserva como fila aunque el catálogo no la
  ofrezca hoy: es parte del cuadro institucional y siempre saldrá en 0.
- Docentes sin dedicación no entran en ninguna columna (en el Excel tampoco),
  pero la pantalla dice cuántos son.
- Solo el administrador (lo impone `GuardiaSesion` por estar bajo `/admin`).

#### Comparativo

- Como el COMPARATIVO ESTADÍSTICO del Excel: el periodo elegido y los tres
  anteriores, del más antiguo al más reciente, con los mismos filtros.
- En pantalla, solo el TOTAL de cada periodo y la variación del último frente
  al anterior **con asignaciones** (contra uno vacío todo parecería crecer
  desde cero). Con las seis dedicaciones por periodo serían 28 columnas; ese
  detalle va en la hoja COMPARATIVO del `.xlsx`.
- Un periodo sin asignaciones se muestra "—" en pantalla y "(sin
  asignaciones)" en el Excel: no es lo mismo que cero docentes.
- Los periodos anteriores al sistema (2022-1 a 2025-1) solo existen como
  cifras pegadas en el Excel; no se cargan.

#### Excel

- Dos hojas: `CUADRO RESUMEN <periodo>` y `COMPARATIVO`. Encabezado
  institucional, bloque en celda combinada, subtotales resaltados, paneles
  inmovilizados y colores de la paleta CECAR.
- El TOTAL de cada fila es una fórmula `SUM(...)` con su resultado, como en
  el formato: quien edite el archivo después no rompe la suma.
- `exceljs` (~1 MB) se importa dentro de `libroCuadroResumen`, al pedir la
  descarga, como `sileo`: no entra al bundle inicial (comprobado en el build).

### Criterios de aceptación

- **CA-005.C1** Dados los 45 docentes del formato de Ingeniería de Sistemas en
  una asignación aprobada, cuando se calcula el cuadro, entonces "Dedicación
  total función docencia", "Total horas de investigación" y "Total horas de
  extensión" suman exactamente lo que `calcularTotales()` da docente a docente.
- **CA-005.C2** En cada bloque, descargas + complementarias = total de
  investigación, y directas + administrativas = total de extensión.
- **CA-005.C3** En cada fila, el total es la suma de las columnas.
- **CA-005.C4** En los bloques de nivel, contrato y categoría, la suma de los
  totales es el número de docentes (si todos tienen el dato).
- **CA-005.C5** Un docente `HORA_LABOR` aparece en la columna "Hora labor".
- **CA-005.C6** Con alcance "Solo aprobadas", una asignación en revisión no
  entra; con "Entregadas", sí; un borrador solo entra con "Todas".
- **CA-005.C7** Dada una sesión de coordinador, cuando abre
  `/admin/reportes/cuadro-resumen`, entonces no ve contenido y vuelve a su
  inicio.
- **CA-005.C8** El `.xlsx` trae las hojas `CUADRO RESUMEN <periodo>` y
  `COMPARATIVO`; en la primera, los valores coinciden con el cuadro y el TOTAL
  es una fórmula `SUM` cuyo resultado es el total de la fila.
- **CA-005.C9** Dado el periodo 2026-2, el comparativo trae 2025-1, 2025-2,
  2026-1 y 2026-2 en ese orden, con los mismos filtros; un periodo cuyas
  asignaciones no entran en el alcance queda marcado como sin asignaciones.

### Evidencia

- `src/lib/reportes.ts` — `asignacionesDelReporte`, `cuadroResumen`,
  `comparativo` (puro).
- `src/lib/exportar-cuadro.ts` — el libro `.xlsx`.
- `src/lib/verificar-reportes.ts` — CA-005.C1 a C6, C8 (genera el libro y lo
  vuelve a leer) y C9: `npx tsx src/lib/verificar-reportes.ts`.
- `src/app/admin/reportes/` — índice de reportes y cuadro resumen.
- CA-005.C7: prueba manual.

### Limitaciones conocidas

- El cuadro recalcula con la configuración vigente. Si después de aprobar se
  cambia el `tipo` de un rol, sus horas se moverían de fila. Para reportar "tal
  como se aprobó" (SPEC-004) hace falta guardar la configuración con la que se
  aprobó cada asignación; queda para cuando exista la base de datos.
- Un docente que figura en dos programas cuenta dos veces, igual que en el
  Excel (una vez por hoja).

### Pendiente

- Cargar las cifras históricas del Excel (2022-1 a 2025-1) si el cliente
  quiere verlas en el comparativo. Son agregados, no asignaciones: irían en
  una tabla aparte y de solo lectura.
- Vista del coordinador limitada a su programa (cuando los usuarios tengan
  programa asignado).

---

## D · Asignación en formato oficial (R1)

### Problema

El coordinador sigue necesitando el FORMATO ÚNICO DE ASIGNACIÓN ACADÉMICA en
Excel: es lo que circula por correo y lo que se archiva. Hoy tendría que
transcribir a mano lo que ya registró en el sistema.

### Solución

Botón **Formato oficial** en `/asignacion/[id]`, para los dos roles y en
cualquier estado. Genera el `.xlsx` con la estructura de
`ASIGNACION_IS_2026_2PV3.xlsx` (`src/lib/exportar-formato.ts`):

- Encabezado institucional, facultad y programa; grupos de columnas en la
  fila 7 y columnas en la 8, con los mismos nombres y en las mismas letras
  (A–AW) que el formato.
- **Un bloque de 10 filas por docente**: datos (A–P) combinados a lo alto;
  descargas (Q–U) y administrativas (V–AB) a tres filas por rol, con la fila
  de totales al final; gran total y dedicación (AC–AJ); una fila por curso
  (AK–AW). Si un docente tiene más cursos o roles que el formato —porque el
  administrador subió los límites— el bloque crece en vez de cortar.
- Las sumas simples son fórmulas (`SUM`, totales, porcentajes con
  `IFERROR`); docencia, investigación y extensión son valores del motor,
  porque las fórmulas matriciales del formato perdían las horas de los roles
  49–56. El libro pide a Excel recalcular al abrir.
- Una segunda hoja con el CUADRO RESUMEN del programa, como el que el
  consolidado pone al pie de cada hoja.

### Reglas

- No se incluyen las columnas auxiliares del formato (`AY:BD`, `DU:EE`): son
  listas de validación y cálculos intermedios, no información.
- Descargar no cambia el estado ni deja evento en la bitácora: es una
  consulta.

### Criterios de aceptación

- **CA-005.D1** (= CA-004.1) Dada la asignación con los 45 docentes del
  formato, cuando se genera el `.xlsx` y se vuelve a leer, entonces el TOTAL
  HORAS SEMANALES (AJ) de cada bloque coincide con el GRAN TOTAL del Excel
  real, incluidos los seis docentes que el Excel descuadraba.
- **CA-005.D2** Hay un bloque por docente y el del primero ocupa las filas
  9–18 (A9:A18 combinada), como en el formato.
- **CA-005.D3** Con la asignación vacía el botón está deshabilitado.

### Evidencia

- `src/lib/exportar-formato.ts`.
- `src/lib/verificar-reportes.ts` — CA-005.D1 y D2.
- CA-005.D3: prueba manual.
