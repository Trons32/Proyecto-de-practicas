# SPEC-018 · Sesión con NextAuth y credenciales de Aldea

**Estado:** fase 1 (piloto) implementada · fase 2 lista en código, espera el contrato de la API de Aldea · **Prioridad:** P0 · **Depende de:** SPEC-008, SPEC-010, SPEC-014 · **Reemplaza:** la cookie propia de SPEC-008

## Problema

Hay dos problemas, y es importante no confundirlos:

1. **Los coordinadores quieren entrar con su usuario y clave de Aldea**, el
   sistema de la universidad, en vez de tener una clave aparte. La API de
   Aldea todavía no está entregada: no se sabe qué recibe ni qué responde.
2. **La sesión se cierra sola mientras se trabaja.** Lo reportó un
   coordinador. La causa está en el código actual, no en Aldea:

   | Dónde | Qué pasa |
   | --- | --- |
   | `lib/servidor/sesion.ts` → `firmarSesion()` | La cookie vence **1 h después del login** (`DURACION_SESION_MS`), aunque el usuario lleve toda esa hora trabajando. Nada la renueva. |
   | `lib/stores/sesion-store.ts` → `iniciar()` / `leer()` | El navegador tiene **su propio reloj de 1 h**, separado del de la cookie. Pueden vencer en momentos distintos. |
   | `lib/datos/almacen.ts` → `setItem` (401) | Si la cookie vence a mitad de una edición, el último cambio **se pierde** y se saca al usuario al login. |

   Una hora es poco para armar la carga de un programa completo, y como el
   vencimiento es absoluto, quien llega a la hora de trabajo pierde lo que
   estaba guardando.

## Decisión

Usar **Auth.js (NextAuth v5)** para manejar la sesión, con un proveedor
`Credentials` cuyo `authorize()` llama a la función que ya tenemos,
`verificarCredenciales()`. Aldea sigue entrando por un único punto
(`lib/servidor/aldea.ts`), y NextAuth se encarga de la cookie, la
renovación, el cierre de sesión y la protección CSRF.

- Paquete: `next-auth@5` (hoy `5.0.0-beta.32`; acepta `next ^16`). Es beta:
  se fija la versión exacta en `package.json`, sin `^`.
- La sesión es **JWT en cookie cifrada** (`strategy: "jwt"`). Es la única
  estrategia que NextAuth admite con `Credentials`, y además coincide con el
  diseño de SPEC-008: sin tabla de sesiones que limpiar.
- **No se usa el adaptador de Prisma** ni las tablas `User`/`Account`/
  `Session` de NextAuth: el usuario sigue siendo `public.usuario` y su rol
  lo sigue decidiendo esa tabla (SPEC-010).

### Alternativa considerada

La sesión que se cierra sola se arregla también sin NextAuth: basta con
renovar la cookie en cada petición a `/api/estado` y quitar el reloj del
navegador (unas 40 líneas). Se elige NextAuth porque lo pidió el cliente y
porque, si sistemas entrega Aldea como inicio de sesión centralizado
(OAuth/OIDC, escenario C abajo), con NextAuth eso es cambiar de proveedor y
no reescribir la sesión.

## Solución

### 0. Dos fases

NextAuth entra desde ya; Aldea queda preparada y se activa después **solo
con configuración**, sin tocar código (salvo ajustar `consultarApi()` si el
contrato real no cabe en las variables `AUTH_API_*`).

| | Fase 1 · Piloto (ahora) | Fase 2 · Aldea (cuando sistemas entregue la API) |
| --- | --- | --- |
| Sesión | NextAuth (secciones 3 a 6) | NextAuth, igual |
| `AUTH_PROVEEDOR` | `local` | `api` |
| Quién valida la clave | `public.usuario.clave_hash` (SPEC-014) | Aldea |
| Alta de coordinadores | `/admin/usuarios` con clave temporal (el administrador la entrega: copiar, WhatsApp o correo, SPEC-014) y cambio obligatorio en el primer ingreso, **como funciona hoy** | `/admin/usuarios` sin clave (sección 2) |
| Quién entra y con qué rol | `public.usuario` | `public.usuario`, igual |

**El piloto no cambia para el usuario**: mismo login, mismas claves, mismo
cambio obligatorio de la clave temporal. Lo único que nota es que la sesión
ya no se cierra sola.

**El paso a Aldea:**

1. Sistemas entrega el contrato; se ajusta `consultarApi()` si hace falta
   y se prueba con `verificar-sesion.ts` contra la API de pruebas.
2. En el servidor: `AUTH_PROVEEDOR=api` y las variables `AUTH_API_*`.
   Reiniciar.
3. Los usuarios del piloto **siguen siendo los mismos**: no se migra ni se
   vuelve a registrar a nadie. Desde ese momento entran con su clave de
   Aldea; su clave local queda en la base, pero ya no sirve para entrar.
4. **Volver atrás es poner `AUTH_PROVEEDOR=local` y reiniciar**: las claves
   locales vuelven a funcionar. Sirve si Aldea falla en los primeros días.

Para que el paso 3 funcione:

- Con `AUTH_PROVEEDOR=api` se **ignora `debe_cambiar_clave`**. Si no, un
  coordinador del piloto que nunca cambió su clave temporal quedaría
  atrapado en la pantalla de cambio de una clave que ya no usa.
- La pantalla "cambiar mi clave" (`/api/usuarios/mi-clave`) responde que
  la clave se cambia en Aldea y no toca el hash.

### 1. La API de Aldea: tres escenarios

Lo que se le pregunta a sistemas define cuál aplica. El resto de la spec no
cambia en ninguno.

| Escenario | Qué entrega sistemas | Qué hacemos |
| --- | --- | --- |
| **A. Validar clave** (el más probable) | Un endpoint al que se envían usuario y clave y responde sí o no. | Proveedor `Credentials`. `consultarApi()` (ya escrita, configurable con `AUTH_API_*`) hace la llamada. Solo se ajusta si el contrato no cabe en esas variables. |
| **B. Validar y devolver datos** | Lo mismo, pero responde también nombre, documento, cargo o programa. | Igual que A. Los datos que traiga se usan para **completar** `public.usuario` (nombre), nunca para dar acceso ni rol. |
| **C. Inicio de sesión centralizado** | OAuth 2 / OpenID Connect / CAS: el usuario se loguea en una página de Aldea y vuelve. | Proveedor OIDC de NextAuth en vez de `Credentials`. El formulario de `/login` se cambia por un botón "Entrar con Aldea". La regla de `public.usuario` se aplica en el callback `signIn`. |

En los tres casos se mantiene la regla de SPEC-010: **estar en Aldea no da
acceso**. Entra solo quien esté activo en `public.usuario`, y con el rol que
diga esa tabla.

### 2. Quién entra: registro previo

**Decisión del cliente:** quién puede usar el sistema lo decide el
administrador, no Aldea. Aldea solo confirma que la clave es de esa persona.

- El administrador da de alta a cada coordinador **una sola vez** en
  `/admin/usuarios`, con correo institucional, nombre, rol y programa. Son
  del orden de 25 personas (una por programa) más los administradores.
- Desde ese momento la persona entra con **su usuario y clave de Aldea**.
  Nunca recibe ni tiene una clave de este sistema.
- `public.usuario` no guarda ninguna clave de quien entra por Aldea:
  `clave_hash` queda vacío y `debe_cambiar_clave` en falso.
- **Si cambia el coordinador de un programa**, el administrador desactiva al
  anterior y da de alta al nuevo. No se borra a nadie: la bitácora y las
  novedades guardan quién hizo cada cosa.
- **Funciona con cualquier API de Aldea**, incluso con una que solo responda
  sí o no (escenario A). No depende de que Aldea devuelva cargo ni programa.

**Cambios en `/admin/usuarios` cuando `AUTH_PROVEEDOR=api`:**

| Hoy (SPEC-014) | Con Aldea |
| --- | --- |
| Al crear la cuenta se genera una clave temporal. | No se genera clave. |
| La clave se envía por SMTP; si el correo falla, la cuenta se borra (CA-014.4). | Se envía, si hay SMTP, un aviso sin clave: "ya puede entrar con su usuario de Aldea". Si el aviso falla, **la cuenta se queda** (no hay ningún secreto que se haya perdido) y el administrador ve la advertencia. |
| En el primer ingreso se obliga a cambiar la clave (CA-014.8). | No aplica: la clave la administra Aldea. |
| "Restablecer clave" | Se oculta: la clave se cambia en Aldea. |

Con `AUTH_PROVEEDOR=local` o `prueba`, SPEC-014 sigue igual.

**Mensaje de error en el login.** Quien tiene clave válida de Aldea pero no
fue dado de alta ve lo mismo que quien se equivocó de clave (CA-010.2), así
no se revela qué correos están registrados. Para que el coordinador sepa qué
hacer, el mensaje dice: *"Usuario o clave incorrectos, o su cuenta no está
habilitada en este sistema. Si es coordinador, pida acceso al
administrador."* Se mantiene el orden actual de `verificarConApi()`:
primero la base y después Aldea, para que Aldea no reciba intentos de
personas que no están registradas.

### 3. Configuración (`src/auth.ts`)

- `providers: [Credentials({ authorize })]`, donde `authorize` lee
  `email` y `clave`, llama a `verificarCredenciales()` y devuelve el
  `Usuario` o `null`. Mismo mensaje para usuario inexistente y clave
  errada (SPEC-008).
- `session: { strategy: "jwt", maxAge: 8 h }`.
  **Vencimiento por inactividad, no por reloj fijo**: mientras el usuario
  use la aplicación, la sesión se renueva; si la deja 8 h, vence.
  (Los valores se confirman con el cliente; ver preguntas abiertas.)
- **Quién renueva.** `auth()` en un route handler lee la sesión pero no
  renueva la cookie (NextAuth descarta su `set-cookie`). La renueva cada
  consulta a `/api/auth/session`: el navegador la hace con la actividad del
  usuario (clic, tecla, foco), como mucho cada 5 min (`RENOVAR_CADA_MS`).
- Callback `jwt`: guarda `id`, `email`, `nombres`, `rol` y
  `debeCambiarClave`. **Cada 15 min vuelve a leer `public.usuario`**: si el
  administrador desactivó la cuenta o cambió el rol, la sesión lo refleja
  sin esperar a que venza. Si ya no está activo, devuelve `null` y la
  sesión termina.
- Callback `session`: expone esos campos al cliente. Nunca la clave ni
  datos de Aldea que no se usen.
- `pages: { signIn: "/login" }`.
- Secreto: `AUTH_SECRET` o, si no está, `SESION_SECRETO`, para que el
  servidor actual no necesite una variable nueva. `trustHost: true` en la
  configuración, porque la VPS va detrás de un proxy inverso.
  `AUTH_PROVEEDOR` y `AUTH_API_*` se conservan.
- Ruta: `app/api/auth/[...nextauth]/route.ts` exporta los handlers.

### 4. "Recordarme"

- **Sin marcar**: cookie de sesión del navegador (muere al cerrarlo), con
  el mismo vencimiento por inactividad.
- **Marcado**: cookie persistente hasta `maxAge`.

NextAuth no trae esta opción de fábrica. El navegador pone la cookie
`cecar-recordarme` (`0` o `1`) antes del login, y la ruta
`api/auth/[...nextauth]` le quita la fecha de vencimiento a la cookie de
sesión de quien no lo marcó (`ajustarRecordarme`). No es secreta: alterarla
solo cambia si la cookie del propio usuario sobrevive al cierre del
navegador.

### 5. Lo que cambia en el código

| Archivo | Cambio |
| --- | --- |
| `lib/servidor/sesion.ts` | `usuarioActual()` **conserva su firma** y pasa a leer de `auth()`. Así `/api/estado`, `/api/importar` y demás rutas no cambian. Se eliminan `firmarSesion`, `verificarSesion` y `COOKIE_SESION`. `verificarCredenciales()` sigue siendo el único punto de entrada de Aldea. |
| `app/api/sesion/route.ts` | Se elimina. Login y logout pasan por `signIn("credentials")` y `signOut()` de NextAuth. |
| `lib/stores/sesion-store.ts` | Deja de guardar la sesión en `localStorage`/`sessionStorage` y **deja de tener reloj propio**: `restaurar()` lee `/api/auth/session`. La cookie es la única verdad sobre si hay sesión. Se conserva la interfaz (`sesion`, `hidratado`, `iniciar`, `cerrar`) para no tocar las vistas. |
| `lib/auth/sesion.ts` | Sale `DURACION_SESION_MS`. Quedan los tipos, los roles y los usuarios de prueba (que siguen sirviendo con `AUTH_PROVEEDOR=prueba`). |
| `components/GuardiaSesion.tsx` | Sin cambio de comportamiento: sigue devolviendo `null` hasta saber si hay sesión. |
| `lib/datos/almacen.ts` | Al recibir 401 en un `PUT`, **no se descarta el cambio**: se pide iniciar sesión de nuevo en un modal sin salir de la página y, al entrar, se reintenta la cola pendiente. |
| `proxy.ts` (opcional, **no se hizo**) | Revisión optimista: sin cookie, redirige a `/login`. Solo lee la cookie, nunca la base (la guía de Next 16 lo advierte: el proxy corre en cada ruta, incluidas las precargas). La autorización real sigue en `usuarioActual()`. |
| `app/admin/usuarios/page.tsx`, `app/api/usuarios/route.ts` | Con `AUTH_PROVEEDOR=api`: alta sin clave, aviso opcional por correo y sin "restablecer clave" (sección 2). |
| `app/login/page.tsx` | El mensaje de error de la sección 2. |
| Cambio obligatorio de clave (fase 1) | Al cambiar la clave temporal, el token de NextAuth se actualiza (`update()`) para que `debeCambiarClave` pase a falso sin cerrar sesión. Hoy lo hace `actualizarUsuario()` del store. |
| `app/api/usuarios/mi-clave` | Con `AUTH_PROVEEDOR=api`, responde que la clave se cambia en Aldea (sección 0). |
| `lib/servidor/verificar-sesion.ts` | Se adapta a la nueva sesión y suma los casos de esta spec. |
| `.env.example`, `DESPLIEGUE.md` | El secreto, las dos fases y cómo pasar a Aldea y volver. |
| `package.json` | `next-auth` con versión exacta y un `override` de `nodemailer`: NextAuth lo pide opcional (v7–8) para un proveedor que no se usa, y el proyecto usa la v10. |

### 6. Al desplegar

El cambio de cookie **invalida todas las sesiones abiertas**: cada usuario
tendrá que iniciar sesión una vez. Se despliega fuera del horario de
trabajo de los coordinadores, o se avisa antes.

## Criterios de aceptación

- **CA-018.1 Sesión que no se cierra sola.** Dado un coordinador que trabaja
  sin pausas largas, cuando pasan más de 60 minutos desde el login, entonces
  sigue con sesión y sus cambios se guardan.
- **CA-018.2 Vence por inactividad.** Dado un usuario sin actividad durante
  más de `maxAge`, cuando vuelve a la aplicación, entonces se le pide
  iniciar sesión.
- **CA-018.3 No se pierde el último cambio.** Dado que la sesión venció
  mientras el usuario editaba, cuando guarda, entonces se le pide la clave
  en un modal y, al entrar, el cambio se guarda sin repetirlo.
- **CA-018.4 Aldea valida, `public.usuario` autoriza.** Dada una clave
  válida en Aldea, cuando el correo no está activo en `public.usuario`,
  entonces no entra (se mantiene CA-010.2).
- **CA-018.5 Desactivar surte efecto.** Dado un usuario con sesión abierta,
  cuando el administrador lo desactiva, entonces pierde el acceso en máximo
  15 min (`REVALIDAR_MS`), sin esperar a que venza la sesión.
- **CA-018.6 Aldea caída.** Dada la API de Aldea sin responder, cuando
  alguien intenta entrar, entonces ve "credenciales incorrectas" en máximo
  `AUTH_API_ESPERA_MS` y el error queda en el log del servidor (se
  mantiene CA-010.3).
- **CA-018.7 El rol sale del servidor.** Dada una sesión de coordinador,
  cuando el navegador manipula el rol en el cliente, entonces `/api/estado`
  sigue respondiendo como coordinador.
- **CA-018.8 Sin usuarios de prueba en producción.** Se mantiene CA-010.1.
- **CA-018.9 Cerrar sesión.** Dado un usuario que cierra sesión, cuando usa
  "atrás" en el navegador o llama a `/api/estado`, entonces no ve datos (401).
- **CA-018.11 Alta sin clave.** Dado `AUTH_PROVEEDOR=api`, cuando el
  administrador da de alta a un coordinador, entonces no se genera ni se
  envía ninguna clave, `clave_hash` queda vacío y el coordinador entra con
  su clave de Aldea sin pasos adicionales.
- **CA-018.12 Cambio de coordinador.** Dado un coordinador desactivado y
  uno nuevo dado de alta en el mismo programa, cuando ambos intentan entrar
  con su clave de Aldea, entonces solo entra el nuevo, y la bitácora sigue
  mostrando el nombre del anterior en lo que hizo.
- **CA-018.13 Piloto igual que hoy.** Dado `AUTH_PROVEEDOR=local`, cuando
  el administrador crea un coordinador, entonces recibe la clave temporal
  para entregarle, entra con ella, se le obliga a cambiarla y, al hacerlo, sigue
  con sesión sin volver a iniciarla.
- **CA-018.14 Pasar a Aldea es configuración.** Dado un coordinador creado
  en el piloto, cuando se cambia a `AUTH_PROVEEDOR=api`, entonces entra con
  su clave de Aldea sin pasar por el cambio de clave, y su clave local deja
  de funcionar.
- **CA-018.15 Volver atrás.** Dado el mismo coordinador, cuando se vuelve a
  `AUTH_PROVEEDOR=local`, entonces su clave local vuelve a funcionar.
- **CA-018.10 La clave no se guarda.** Ni en la cookie, ni en el token, ni
  en logs, ni en `public.usuario` cuando el proveedor es `api`.

## Evidencia

- CA-018.4, .6, .7, .8, .10: `src/lib/servidor/verificar-sesion.ts`
  (con la API de Aldea simulada).
- CA-018.1, .2, .5: `verificar-sesion.ts` con el reloj inyectado, más
  prueba manual con `maxAge` reducido.
- CA-018.11, .14 y .15: `src/lib/servidor/verificar-credenciales.ts`
  (cambiando el proveedor en la prueba, con Aldea simulada).
- CA-018.13: `verificar-credenciales.ts` más prueba manual con SMTP.
- CA-018.3, .9 y .12: manual, con los dos roles, en el navegador.

## Preguntas para sistemas (Aldea)

1. ¿Es un endpoint que valida usuario y clave (escenario A/B) o un inicio
   de sesión centralizado OAuth/OIDC/CAS (escenario C)?
2. URL de pruebas y de producción. ¿Es accesible desde la VPS
   (`planificacionacademica.cecar.edu.co`) o hay que abrir firewall?
3. ¿Qué campos recibe? ¿El usuario va con dominio (`jperez@cecar.edu.co`) o
   sin él (`jperez`)?
4. ¿Cómo autentica nuestra aplicación ante la API: token fijo, usuario de
   servicio, IP permitida, certificado?
5. ¿Qué responde en caso de éxito y de fallo (código HTTP y cuerpo)? Un
   ejemplo real de cada uno.
6. ¿Devuelve datos del usuario (nombre, programa, cargo)? ¿Podemos usarlos?
7. ¿Tiene límite de intentos o bloqueo de cuenta? Para no bloquear a un
   coordinador por reintentos nuestros.
8. Para OIDC: `client_id`, `client_secret`, URL de descubrimiento
   (`.well-known/openid-configuration`) y la URL de retorno que debemos
   registrar.

## Preguntas para el cliente

1. ¿Cuánto tiempo sin actividad debe aguantar la sesión? Se propone 8 h
   (una jornada).
2. ¿Se mantiene "Recordarme"? Si se mantiene, ¿hasta cuánto (8 h, 7 días)?
3. ¿El administrador entra también con Aldea, o conserva una clave local
   (`AUTH_PROVEEDOR=local`, SPEC-014) por si Aldea se cae?

## Fuera de alcance

- Crear usuarios automáticamente al entrar por primera vez desde Aldea, o
  una bandeja de solicitudes de acceso. Se descartaron a favor del registro
  previo (sección 2); se pueden retomar si la cantidad de usuarios crece.
- Sacar el programa del coordinador desde Aldea (queda pendiente de la
  respuesta 6 a sistemas).
