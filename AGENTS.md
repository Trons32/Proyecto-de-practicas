<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Asignación Académica — CECAR

Sistema para asignar carga docente de pregrado. Reemplaza el formato oficial en
Excel (`ASIGNACION_IS_2026_2PV3.xlsx`): el coordinador registra los docentes de
su programa, reparte horas entre cursos, descargas y actividades
administrativas, y el sistema le dice si la carga cuadra con la dedicación.

Next.js 16 · App Router · React 19 · Tailwind v4 · Zustand. **Sin backend**: hoy
todo vive en el navegador.

---

## Lo primero que hay que entender

### 1. El Excel es la fuente de verdad del negocio

Los catálogos, los topes de horas y las fórmulas no se inventaron aquí: se
extrajeron del formato oficial. `lib/catalogos.ts` lo dice en su primera línea
—*generado desde el .xlsx, no editar a mano*— y `lib/calculo.ts` lleva las
fórmulas matriciales originales en el comentario, encima de su traducción.

**No cambies un tope, un rol ni una regla porque "se ve raro".** Si el formato
dice que tiempo completo son 40 h con 5 de preparación, son 40 y 5. Lo que sí es
configurable lo cambia el administrador en `/admin/parametros`, en runtime.

### 2. El motor de cálculo corrige al Excel, y eso está verificado

El formato clasificaba las descargas por **posición** en la lista de roles
(`SUMIF` sobre los rangos `DU9:DU33`, `DU34:DU46`, `DU47:DU56`). Los roles 49–56
caían fuera de todo rango y **sus horas se perdían**: seis docentes descuadraban.

Aquí la clasificación va por el campo `tipo` del rol, y los roles rescatados
llevan `reclasificado: true`. Hay una prueba que lo demuestra contra los 45
docentes reales del formato:

```bash
npx tsx src/lib/verificar.ts
```

**Córrela siempre que toques `lib/calculo.ts`, `lib/catalogos.ts` o
`lib/tipos.ts`.** Si falla, el cambio está mal —no el fixture.

### 3. Todo es cliente, y todo se persiste a mano

No hay base de datos, ni API, ni server actions. Cada página empieza con
`"use client"` y el estado vive en tres stores de Zustand:

```
lib/stores/asignacion-store.ts   las asignaciones   → localStorage (persist)
lib/stores/config-store.ts       la parametrización → localStorage (persist)
lib/stores/novedades-store.ts    las novedades      → localStorage (persist)
lib/stores/sesion-store.ts       la sesión          → local o session, a mano
```

Los tres primeros no tocan localStorage: persisten por `almacenamiento()` de
`lib/datos/almacen.ts`, el único punto a cambiar para pasar a SQL. No
añadas otro `localStorage` suelto ni cambies las claves de `CLAVES`: los
datos guardados quedarían huérfanos.

---

## Las trampas de este repo

### 1. Nada se pinta antes de `hidratado`

Los stores se rehidratan desde `localStorage` **después** del primer render. Si
lees `asignaciones` sin esperar, el usuario ve "no hay asignaciones" durante un
parpadeo y luego aparecen. Por eso cada store expone `hidratado` y cada vista lo
respeta:

```tsx
const hidratado = useAsignacionStore((s) => s.hidratado);
if (!hidratado) return <Cargando />;   // o el esqueleto que use esa vista
```

`GuardiaSesion` hace lo mismo con la sesión: mientras no se restaura devuelve
`null`, para no mostrar ni un instante contenido que el usuario quizá no puede
ver.

### 2. `params` es una promesa

En Next 16 los parámetros de ruta llegan como `Promise` y se abren con `use()`:

```tsx
export default function VistaAsignacion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
```

### 3. La sesión no usa el middleware `persist`

"Recordarme" decide el destino: `localStorage` sobrevive al cierre del navegador,
`sessionStorage` no. `persist` fija un solo destino, así que `sesion-store.ts`
guarda, lee y borra a mano —y envuelve **todo** acceso a storage en `try/catch`,
porque en modo privado revienta. Respeta ese patrón si lo tocas.

### 4. El orden de las clases de Tailwind no es especificidad

`globals.css` declara componentes (`.campo`, `.tarjeta`, `.etiqueta`) con
`@apply`. Tailwind emite sus utilidades **antes** que esas clases, así que un
`ps-11` puesto en el elemento perdería contra el padding de `.campo` por orden.
La hoja lo sortea con `:not([class*="ps-"])`, y `Seleccion` abre el hueco de la
flecha con `pe-9`, **nunca** con `pr-9`. Los comentarios del CSS explican cada
caso: si un padding no "pega", léelos antes de añadir un `!important`.

### 5. Los toasts cargan `sileo` bajo demanda

`lib/toast.ts` importa la librería de forma diferida y despierta al `Toaster` con
un evento. Importa siempre desde `@/lib/toast`, no desde `sileo` directamente:
hacerlo mete la librería al bundle inicial. Lo mismo con `exceljs`: solo se
importa dentro de `cargarExcelJS()` de `lib/exportar-cuadro.ts`, al pedir la
descarga.

### 6. Una asignación se aprueba, no se "completa"

El coordinador no cierra su propia asignación: la **entrega**, y el
administrador la aprueba o se la devuelve. El ciclo vive en `lib/tipos.ts`:

```
BORRADOR ──envía──► ENVIADA ──cierra convocatoria──► EN_REVISION
                       ▲                                 │
                       │                    ┌────────────┴────────────┐
                       │                 aprueba                  devuelve
                       │                    │                         │
                       │                    ▼                         ▼
                       └──reenvía──── EN_CORRECCION ◄──────────── APROBADA
                                                  (cambio de parámetros)
```

**`esEditable(estado)` es la única autoridad sobre si se puede tocar algo**:
solo `borrador` y `en_correccion`. El store lo hace cumplir —`agregarDocente`,
`actualizarDocente` y `eliminarDocente` no hacen nada si la asignación está
congelada— así que ocultar un botón no basta ni es lo que protege el dato.

**Hay dos relojes distintos** y confundirlos rompe el flujo:

- La **convocatoria** (`lib/convocatoria.ts`) es el plazo general del periodo,
  uno por periodo, que abre el administrador.
- El **plazo de corrección** (`asignacion.plazoCorreccion`) es el que se fija al
  devolver *una* asignación. Manda sobre el anterior: la convocatoria ya cerró y
  aun así el coordinador tiene que poder reenviar.

`usePlazo()` en `lib/usar-plazo.ts` resuelve cuál aplica. Úsalo en vez de
comparar fechas a mano.

**La bitácora es append-only.** Cada transición agrega un evento con quién,
cuándo y por qué; los eventos no se editan ni se borran, porque su valor está en
que nadie pueda reescribir lo que pasó. Las transiciones se hacen **solo** con
las acciones del store (`enviar`, `aprobar`, `devolver`,
`reabrirPorParametros`…), nunca con `actualizarAsignacion({ estado })`: eso
cambiaría el estado sin dejar rastro.

Los plazos vencen a las **23:59** del día indicado (`finDelDia`), no al
arranque: si no, el coordinador pierde las 24 h que cree tener.

**Un cambio de parámetros no recalcula lo aprobado.** Las asignaciones
cerradas quedan guardadas tal como se entregaron. `lib/impacto.ts` las vuelve
a validar con la configuración vigente para mostrar cuáles *dejarían* de
cumplirla —revalidando de verdad, no adivinando por qué campo se tocó— y el
panel de `/admin/parametros` deja que el administrador elija a cuáles pedir
corrección. **Nada se reabre solo**: un cambio puede ser a futuro y no deber
tocar lo ya cerrado; esa decisión es suya.

### 7. Los parámetros solo cambian con una novedad

`/admin/parametros` edita un **borrador**; nada se aplica al teclear. Al
aplicar, `aplicarParametros` del store de novedades cambia la configuración
**y** registra la novedad (autor, motivo, antes → después, foto de las
aprobadas afectadas) en una sola operación. `config-store` ya no expone
acciones sueltas por campo: `reemplazarParametros` existe solo para que lo
llame ese store. No lo uses desde una vista, o el cambio queda sin rastro.

Igual con las reaperturas por parámetros: pasa por `solicitarCorreccion` del
store de novedades, que llama a `reabrirVarias` y deja la decisión en la
novedad. Las novedades, como la bitácora, solo se añaden.

### 8. Crear una asignación no es lo mismo que consultarla

Son dos actos distintos y la interfaz los separa:

- **Crear** (`/asignacion/nueva`) mira hacia adelante. El desplegable de
  periodo ofrece **solo el actual y el siguiente** (`periodosAsignables()` en
  `lib/tipos.ts`); no se alimenta el histórico desde ahí. Ofrecer diez años
  hacia atrás solo servía para equivocar la fecha.
- **Consultar** (`/asignacion`) muestra la **asignación en curso** destacada y,
  debajo, el **historial paginado** con todo lo demás.

Qué cuenta como "en curso" lo decide `separarEnProgreso()` en `lib/resumen.ts`:
el borrador editado más recientemente. **Esa función es la única definición**;
la usan el inicio y el listado para no poder señalar asignaciones distintas como
la actual. Si cambias el criterio, cámbialo ahí.

El semestre en curso se parte por mitad de año: enero–junio es el 1, julio–
diciembre el 2 (`periodoActual()`).

### 9. El motor de cálculo es puro, a propósito

`calcularTotales(docente, config)` recibe la configuración **como argumento** en
vez de leer el store, para poder verificarse fuera de React. No le metas un
`useConfigStore` dentro. Desde una vista, la configuración vigente se obtiene con
el hook `useConfiguracion()`.

---

## Dónde está cada cosa

```
app/login                        inicio de sesión
app/                             inicio del coordinador
app/asignacion                   listado e histórico
app/asignacion/nueva             crear
app/asignacion/[id]              una asignación y sus docentes
app/asignacion/[id]/docente/[docenteId]   la ficha: cursos, descargas, horas
app/admin                        panel del administrador
app/admin/parametros             roles, reglas y límites en runtime
app/admin/asignaciones           bandejas: aprobar, devolver, abrir convocatorias
app/admin/novedades              cambios de parámetros y a quién afectaron
app/admin/datos                  respaldo: exportar e importar todo en JSON
app/admin/reportes               reportes; el cuadro resumen del consolidado

lib/catalogos.ts     datos del formato oficial ← NO EDITAR A MANO
lib/calculo.ts       motor de cálculo y validaciones ← PURO
lib/tipos.ts         modelo de dominio, ciclo de vida y constructores
lib/convocatoria.ts  plazos de entrega y su vencimiento
lib/usar-plazo.ts    qué plazo rige y si se puede enviar (hook usePlazo)
lib/impacto.ts       qué aprobadas rompe un cambio de parámetros
lib/novedades.ts     diferencias de parámetros y foto de impacto ← PURO
lib/resumen.ts       totales por asignación y separarEnProgreso()
lib/reportes.ts      cuadro resumen y comparativo ← PURO
lib/exportar-cuadro.ts   el cuadro en .xlsx (exceljs bajo demanda)
lib/exportar-formato.ts  una asignación en el formato oficial .xlsx
lib/verificar.ts     prueba contra los 45 docentes reales
lib/verificar-novedades.ts   prueba de la lógica de novedades
lib/verificar-respaldo.ts    prueba del respaldo JSON
lib/verificar-reportes.ts    prueba del cuadro resumen contra el motor
lib/datos/almacen.ts         dónde persisten los stores ← punto de cambio a SQL
lib/datos/respaldo.ts        formato y validación del respaldo ← PURO
db/                  esquema SQL Server, semilla y migración (ver db/README.md)
specs/               especificaciones (Spec-Driven Development)
lib/auth/sesion.ts   usuarios de prueba y roles ← único punto a cambiar por la API
lib/stores/*         estado persistido

components/ui.tsx    Campo, Entrada, Seleccion, Seccion, Boton…
components/*         el resto de piezas compartidas
```

---

## Convenciones

- **Todo el código está en español**: nombres de archivo, componentes, variables,
  tipos y comentarios. `Docente`, `calcularTotales`, `BarraLateral`. Mantenlo.
- **Los comentarios explican el *porqué*, no el *qué*.** Mira `calculo.ts` o
  `globals.css`: documentan la decisión y el error que evitan. Si tu comentario
  repite lo que el código ya dice, sobra.
- **Los formularios usan `components/ui.tsx`**, no `<input>` sueltos. Si falta
  una variante, añádela ahí.
- **Colores por token**: `cecar-600`, `var(--color-borde)`,
  `var(--color-texto-suave)`. Nada de hexadecimales sueltos ni de `gray-*` para
  superficies.
- Rutas con alias `@/*` → `src/*`.

---

## Antes de dar por bueno un cambio

```bash
npx tsc --noEmit                # 0 errores
npm run lint
npx tsx src/lib/verificar.ts    # si tocaste cálculo, catálogos o tipos
npx tsx src/lib/verificar-novedades.ts   # si tocaste lib/novedades.ts
npx tsx src/lib/verificar-respaldo.ts    # si tocaste lib/datos/ o los tipos
npx tsx src/lib/verificar-reportes.ts    # si tocaste lib/reportes.ts, exportar-*.ts o el cálculo
```

Una funcionalidad nueva empieza por su `specs/NNN-nombre/spec.md`.

Y pruébalo **con los dos roles** (`admin@cecar.edu.co` / `admin123`,
`coordinador@cecar.edu.co` / `coord123`): media funcionalidad está detrás de
`GuardiaSesion` y de comprobaciones de rol.

---

## Cosas que NO se hacen sin preguntar

- Editar `lib/catalogos.ts` a mano, o cambiar topes y reglas del formato oficial.
- Tocar `lib/__fixture.json` para que `verificar.ts` pase.
- Cambiar la forma del estado persistido sin subir `version` y escribir el
  `migrate` del store: rompe los datos que el usuario ya tiene guardados.
  (Van por `asignaciones` v3, `configuracion` v2 y `novedades` v1.)
- Cambiar el estado de una asignación fuera de las acciones del ciclo de vida,
  o editar la bitácora: deja el expediente mintiendo.
- Permitir que se edite una asignación ya entregada. Si hace falta reabrirla,
  se reabre por el camino previsto (`reabrirPorParametros`), que deja rastro.
- Traer un backend, una base de datos o un ORM. Cuando exista la API real, los
  puntos de entrada son `autenticar()` en `lib/auth/sesion.ts` y
  `almacenamiento()` en `lib/datos/almacen.ts`; el esquema ya está en `db/`.
- Cambiar la forma de `Asignacion`, `Docente` o `Novedad` sin revisar
  `db/esquema.sql` y `db/respaldo-a-sql.ts`: la migración dejaría de cuadrar.
- Si cambia `catalogos.ts`, regenerar la semilla: `npx tsx db/generar-semilla.ts`.
