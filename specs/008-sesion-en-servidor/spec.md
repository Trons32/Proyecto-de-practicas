# SPEC-008 · Sesión en el servidor

**Estado:** implementada (usuarios de prueba) · **Prioridad:** P0 · **Depende de:** SPEC-006, SPEC-007

## Problema

La API de SPEC-006 respondía a cualquiera que alcanzara el servidor, y
SPEC-007 validaba el rol con lo que el propio navegador declaraba en cada
evento. La sesión vivía solo en el navegador.

## Solución

- `POST /api/sesion` valida usuario y clave en el servidor y deja una
  cookie `httpOnly`, firmada con HMAC-SHA256 (`SESION_SECRETO`), con el
  usuario y su vencimiento (una hora). `DELETE` la borra.
- `/api/estado` exige esa cookie (401 sin ella). Parámetros y novedades
  solo los escribe el administrador (403). En las asignaciones, cada evento
  nuevo tiene que llevar el nombre y el rol del usuario de la cookie.
- En el navegador nada cambia para las vistas: `autenticar()` llama al
  servidor cuando `NEXT_PUBLIC_ALMACEN=sql`, y al iniciar sesión se recargan
  los stores (antes del login la API los rechazó).
- Si la cookie vence mientras se trabaja, el siguiente guardado responde 401:
  se avisa y se cierra la sesión.

### Decisión: cookie firmada, sin tabla de sesiones

No hay estado en el servidor que limpiar y cerrar sesión es borrar la
cookie. El costo: una cookie robada vale hasta que vence. Con una hora de
duración se acepta; si sistemas exige revocar sesiones al instante, se
añade una tabla `aa.sesion` y se consulta en `usuarioActual()`.

### Decisión: Aldea entra por un solo punto

`verificarCredenciales()` en `lib/servidor/sesion.ts` es lo único que
cambia cuando sistemas defina el mecanismo (LDAP, OAuth/OIDC, un servicio
propio). Hoy busca en los usuarios de prueba. El rol y el programa del
coordinador los decide esta aplicación (`aa.usuario`), no Aldea.

## Criterios de aceptación

- **CA-008.1** Sin cookie, la API responde 401; con una cookie alterada,
  vencida o firmada con otro secreto, también.
- **CA-008.2** Un coordinador no puede escribir parámetros ni novedades.
- **CA-008.3** Un coordinador no puede aprobar aunque falsifique el evento
  como ADMIN, ni registrar eventos a nombre de otro.
- **CA-008.4** El servidor no arranca la firma con un secreto de menos de
  32 caracteres.
- **CA-008.5** La clave no sale del servidor ni queda guardada.

## Evidencia

- CA-008.1, .4 y .5: `src/lib/servidor/verificar-sesion.ts`.
- CA-008.3: `src/lib/verificar-transiciones.ts`.
- CA-008.1, .2 y .3 por HTTP contra el servidor de desarrollo: sin sesión
  401; clave errada 401; coordinador crea y envía 204; coordinador que se
  aprueba 409; coordinador que cambia parámetros 403; administrador aprueba
  204; cookie alterada 401; tras cerrar sesión 401.

## Pendiente con sistemas

- El mecanismo de Aldea (ver `db/README.md` y la conversación con el
  coordinador de sistemas).
- Si hace falta revocar sesiones antes de que venzan.
- De dónde sale el programa de cada coordinador (hoy no se limita qué
  asignaciones ve).
