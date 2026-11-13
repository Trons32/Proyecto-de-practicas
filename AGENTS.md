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

Next.js 16 · App Router · React 19 · Tailwind v4 · Zustand. Los datos
persisten siempre en PostgreSQL vía Prisma (SPEC-006, SPEC-011), con sesión
de NextAuth en el servidor (SPEC-018). No hay modo localStorage.

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

No hay server actions. Cada página empieza con `"use client"` y el estado
vive en tres stores de Zustand:

```
lib/stores/asignacion-store.ts   las asignaciones   → PostgreSQL (persist)
lib/stores/config-store.ts       la parametrización → PostgreSQL (persist)
lib/stores/novedades-store.ts    las novedades      → PostgreSQL (persist)
lib/stores/sesion-store.ts       la sesión          → la cookie de NextAuth, solo consulta
```

Los tres primeros persisten por `almacenamiento()` de
`lib/datos/almacen.ts`. Ese adaptador habla con
`/api/estado/[clave]` (`lib/servidor/`) y envía **solo lo que cambió**, para
que un cliente no borre lo que creó otro. No añadas otro `localStorage`
suelto ni cambies las claves de `CLAVES`: los datos guardados quedarían
huérfanos, y la API las usa como ruta.

`lib/servidor/` solo se importa desde el servidor (route handlers y
scripts): lleva las credenciales de la base.

---

## Las trampas de este repo

### 1. Nada se pinta antes de `hidratado`

Los stores se rehidratan desde la base (`/api/estado`) **después** del primer render. Si
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

### 3. La sesión es la cookie de NextAuth, y vence por inactividad

`src/auth.ts` configura NextAuth (SPEC-018). La cookie es httpOnly: el
navegador no guarda la sesión en ningún storage ni lleva reloj propio;
`sesion-store.ts` pregunta a `/api/auth/session`. Antes había dos relojes
de una hora y vencían a destiempo: no vuelvas a poner uno.

- **Dura 8 h sin actividad**, no 8 h desde el login. `auth()` en un route
  handler **no** renueva la cookie (NextAuth descarta su `set-cookie`); la
  renueva `renovar()` del store, que `ReingresoSesion` llama con la
  actividad del usuario.
- **Si vence con la página abierta no se manda al login**: el 401 marca
  `vencida`, `ReingresoSesion` pide la clave y `reanudarGuardado()` reenvía
  lo pendiente. Ir al login recargaría los stores y perdería el cambio.
- **El token se compara con `public.usuario` cada 15 min** (`refrescarToken`):
  desactivar a alguien o cambiarle el rol llega solo.
- **"Recordarme"** lo resuelve la ruta `api/auth/[...nextauth]` quitando la
  fecha a la cookie según `cecar-recordarme`; NextAuth no lo trae.
- Desde el servidor, el usuario siempre sale de `usuarioActual()`.

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

Con SQL, el servidor lo vuelve a comprobar: `lib/transiciones.ts` exige que
todo cambio de estado se explique con un evento nuevo de la bitácora, en el
orden del ciclo, y rechaza (409) lo demás. **Si agregas una transición al
store, agrégala también a `PASOS` en `transiciones.ts`** o el servidor la
rechazará; `verificar-transiciones.ts` lo detecta porque recorre el ciclo con
las acciones reales del store.

**Hay dos relojes distintos** y confundirlos rompe el flujo:

- La **convocatoria** (`lib/convocatoria.ts`) es el plazo general del periodo,
  uno por periodo, que abre el administrador.
- El **plazo de corrección** (`asignacion.plazoCorreccion`) es el que se fija al
  devolver *una* asignación. Manda sobre el anterior: la convocatoria ya cerró y
  aun así el coordinador tiene que poder reenviar.

`usePlazo()` en `lib/usar-plazo.ts` resuelve cuál aplica. Úsalo en vez de
comparar fechas a mano.

**La línea base es lo proyectado (SPEC-009).** La primera aprobación guarda
los cursos en `asignacion.lineaBase`; reabrir y corregir no la toca. El
reporte de proyección compara esa foto con lo vigente. Solo `aprobar` la
fija, y el servidor rechaza cualquier otro cambio.

**Las importadas no son del ciclo (SPEC-017).** Una asignación cargada
desde el Excel de un periodo anterior nace aprobada con un único evento
`importada`; `esImportada(a)` lo detecta. No se reabre, no se edita, no
entra en el impacto de parámetros ni en la proyección, y en el comparativo
solo reemplaza al consolidado cuando el periodo tiene todos sus programas
(`coberturaImportada`).

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

En `/admin/parametros` cada cosa se edita en su propio modal y se guarda al
pulsar Guardar (SPEC-012); no hay borrador de página. Guardar llama a
`aplicarParametros` del store de novedades, que cambia la configuración
**y** registra la novedad (autor, motivo, antes → después, foto de las
aprobadas afectadas), y **espera a que la base confirme**: si falla, deshace
y el modal muestra el error. El motivo es opcional salvo que el cambio
afecte aprobadas (`motivoPorDefecto` lo rellena). Los roles no se borran:
se **desactivan** (`inactivo`, en la base `rol.vigente = false`) y siguen
sumando horas donde ya se usan. `config-store` ya no expone
acciones sueltas por campo: `reemplazarParametros` existe solo para que lo
llame ese store. No lo uses desde una vista, o el cambio queda sin rastro.

Cada registro es **novedad** (convocatoria cerrada) u **observación**
(convocatoria abierta), según `claseDe()` de `lib/novedades.ts` (SPEC-013).
Es la única definición; la clase se fija al registrar y no cambia. Para
mostrarlo usa `tituloDe()`, no `numero` (cada clase numera por su lado).

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
app/admin/novedades              cambios con la convocatoria cerrada y a quién afectaron
app/admin/observaciones          cambios con la convocatoria abierta
app/admin/datos                  respaldo: exportar e importar todo en JSON
app/admin/datos/importar         asignaciones de periodos anteriores desde Excel (SPEC-017)
app/admin/reportes               reportes; el cuadro resumen del consolidado
app/criterios                    criterios de asignación del periodo (los dos roles)

lib/catalogos.ts     datos del formato oficial ← NO EDITAR A MANO
lib/calculo.ts       motor de cálculo y validaciones ← PURO
lib/tipos.ts         modelo de dominio, ciclo de vida y constructores
lib/convocatoria.ts  plazos de entrega y su vencimiento
lib/usar-plazo.ts    qué plazo rige y si se puede enviar (hook usePlazo)
lib/impacto.ts       qué aprobadas rompe un cambio de parámetros
lib/transiciones.ts  qué cambios admite el servidor en una asignación ← PURO
lib/verificar-transiciones.ts   prueba del ciclo con las acciones del store
lib/novedades.ts     diferencias de parámetros y foto de impacto ← PURO
lib/resumen.ts       totales por asignación y separarEnProgreso()
lib/reportes.ts      cuadro resumen, comparativo y proyección ← PURO
lib/criterios.ts     texto de los criterios del Consejo Académico ← CONSULTA, NO REGLAS
lib/historicos.ts    cifras 2022-1…2025-2 del consolidado ← GENERADO, NO EDITAR A MANO
components/Graficas.tsx   gráficas SVG de los reportes (paleta validada, ver el comentario)
lib/exportar-cuadro.ts   el cuadro en .xlsx (exceljs bajo demanda)
lib/exportar-formato.ts  una asignación en el formato oficial .xlsx
lib/exportar-comparativo.ts   el comparativo y la proyección en .xlsx
lib/cursos-conocidos.ts   sugerencias y duplicado de cursos ← PURO (SPEC-019)
lib/verificar-cursos.ts   prueba de lo anterior
lib/verificar.ts     prueba contra los 45 docentes reales
lib/verificar-novedades.ts   prueba de la lógica de novedades
lib/verificar-respaldo.ts    prueba del respaldo JSON
lib/verificar-reportes.ts    prueba del cuadro resumen contra el motor
lib/importar/*       leer un Excel de asignación de cualquier año ← PURO (SPEC-017)
lib/verificar-importacion.ts   prueba del importador contra el formato real
app/api/importar     guarda una asignación importada (solo administrador)
lib/datos/almacen.ts         dónde persisten los stores ← punto de cambio a SQL
lib/datos/respaldo.ts        formato y validación del respaldo ← PURO
lib/servidor/*       conexión (Prisma), lectura y escritura en PostgreSQL ← SOLO SERVIDOR
lib/servidor/verificar-sql.ts   prueba de ida y vuelta contra la base
app/api/estado/[clave]       la API de estado (exige la cookie de sesión)
src/auth.ts                  NextAuth: proveedor de credenciales y callbacks (SPEC-018)
app/api/auth/[...nextauth]   login, logout y sesión de NextAuth; "Recordarme"
lib/servidor/sesion.ts       qué lleva el token, usuarioActual() y verificarCredenciales() ← AQUÍ ENTRA ALDEA
components/ReingresoSesion.tsx   renueva la sesión con la actividad y pide la clave si vence
lib/servidor/aldea.ts        la API de credenciales + public.usuario (SPEC-010)
app/api/salud                sonda del despliegue: ¿hay base y secreto?
DESPLIEGUE.md                paso a paso para producción
prisma/migrations/   tablas, triggers, CHECK y permisos ← SQL A MANO (ver db/README.md)
prisma/seed.ts       catálogos (desde catalogos.ts) y usuarios iniciales
prisma/schema.prisma modelo de Prisma ← reflejo de la base con `prisma db pull`, NO EDITAR A MANO
db/                  respaldo-a-sql.ts, prueba-esquema.sql, generar-historicos.ts
.env.example         todas las variables; la base es DATABASE_URL
src/generated/prisma cliente de Prisma ← generado en postinstall, fuera de git
specs/               especificaciones (Spec-Driven Development)
lib/auth/sesion.ts   tipos, roles y usuarios de prueba (navegador y servidor)
lib/auth/cliente.ts  autenticar() y leerSesion() del navegador, vía NextAuth
lib/stores/*         estado persistido

components/ui.tsx    Campo, Entrada, Seleccion, SelectorBuscable, Contador, Seccion, Boton…
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
npx tsx src/lib/verificar-transiciones.ts   # si tocaste el ciclo de vida o el store de asignaciones
npx tsx src/lib/verificar-importacion.ts "<ASIGNACION_IS_2026_2PV3.xlsx>"   # si tocaste lib/importar/, transiciones o reportes
npx tsx src/lib/servidor/verificar-sesion.ts   # si tocaste la sesión o lib/auth/
npx tsx src/lib/verificar-cursos.ts   # si tocaste lib/cursos-conocidos.ts
DATABASE_URL=postgresql://…/asignacion_academica_prueba npx tsx src/lib/servidor/verificar-sql.ts   # si tocaste lib/servidor/ o los tipos
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
  (Van por `asignaciones` v4, `configuracion` v2 y `novedades` v1.)
- Cambiar el estado de una asignación fuera de las acciones del ciclo de vida,
  o editar la bitácora: deja el expediente mintiendo.
- Permitir que se edite una asignación ya entregada. Si hace falta reabrirla,
  se reabre por el camino previsto (`reabrirPorParametros`), que deja rastro.
- Traer otro ORM u otro motor de base de datos. La base es PostgreSQL y se
  habla con Prisma desde `lib/servidor/` (SPEC-011).
- Usar `prisma db push`, o generar una migración sin revisar su SQL. Las
  migraciones llevan triggers, CHECK y permisos que Prisma no expresa: se
  crean con `migrate dev --create-only`, se completan a mano y luego
  `prisma db pull` actualiza `schema.prisma`.
- Escribir desde `/api/estado` sin pasar por `usuarioActual()`, o confiar en
  el `rolAutor` que manda el navegador: el rol sale de la cookie.
- Cambiar cómo se validan las credenciales fuera de `verificarCredenciales()`
  (`lib/servidor/sesion.ts`): es el único punto donde entra Aldea.
- Cambiar la forma de `Asignacion`, `Docente` o `Novedad` sin revisar
  una migración nueva en `prisma/migrations/` y `db/respaldo-a-sql.ts`: la migración de datos dejaría de cuadrar.
- Si cambia `catalogos.ts`, volver a correr `npx prisma db seed` (solo agrega lo que falta).
- Editar `lib/historicos.ts` a mano. Se regenera desde el consolidado con
  `npx tsx db/generar-historicos.ts "<consolidado.xlsx>"`; sus cifras dudosas
  se conservan a propósito (spec 009).
- Editar una migración ya aplicada en `prisma/migrations/`: las bases que
  ya existen no la vuelven a correr. Los cambios van en una migración nueva.
