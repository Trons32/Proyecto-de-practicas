# SPEC-014 · Usuarios y credenciales locales

**Estado:** en implementación · **Prioridad:** P0 · **Depende de:** SPEC-008, SPEC-011

## Problema

El administrador no puede habilitar coordinadores ni entregarles una clave de
acceso. Para las pruebas se necesita administrar esos accesos desde la
aplicación y notificar la credencial inicial al correo institucional.

## Solución

- `/admin/usuarios` permite solamente al administrador crear cuentas,
  activar/desactivar accesos y asignar el programa de cada coordinador.
- Al crear una cuenta se genera una clave temporal en el servidor y se
  guarda únicamente su hash `scrypt`. La entrega la decide el administrador
  (ver "Entrega de credenciales", más abajo).
- El administrador puede fijar su propia clave desde el mismo módulo. Así se
  puede pasar de la validación institucional o de prueba a `AUTH_PROVEEDOR=local`
  sin un acceso oculto de inicialización.
- `AUTH_PROVEEDOR` conserva `api` y `prueba`; el nuevo valor `local` valida la
  clave contra el hash de `public.usuario`.

## Entrega de credenciales (revisión del 2026-11-12)

**Antes:** la clave temporal solo viajaba por SMTP y, si el correo fallaba,
la cuenta se borraba. Sin relay configurado no se podía habilitar a nadie,
y el administrador no tenía cómo hacérsela llegar a un coordinador que no
revisa el correo.

**Ahora:** al crear la cuenta (o al pulsar **Nueva clave** en la tabla), el
administrador ve una sola vez el correo y la contraseña temporal, cada uno
con su botón de copiar, y elige cómo entregarlos:

- **WhatsApp**: abre `wa.me` con el mensaje listo; el administrador elige el
  contacto.
- **Mi correo**: abre su cliente de correo (`mailto:`) con el mensaje listo.
- **Correo institucional**: lo envía el servidor por SMTP. Solo aparece si
  el relay está configurado.
- **Copiar mensaje**: el texto completo, para pegarlo donde quiera.

Por qué es aceptable mostrar la clave: la ve solo un administrador, por
HTTPS y con `Cache-Control: no-store`; es temporal y el usuario debe
cambiarla al primer ingreso (CA-014.8), así que lo que quede en un chat deja
de servir en cuanto entra. En la base sigue solo el hash. Si el
administrador cierra la entrega sin copiarla, **Nueva clave** genera otra:
la anterior no se puede volver a mostrar.

Con `AUTH_PROVEEDOR=api` no hay clave que entregar (SPEC-018).

## Criterios de aceptación

- **CA-014.1** Un coordinador no puede listar ni crear usuarios, aunque llame
  la API directamente.
- **CA-014.2** Solo se crean correos institucionales y cada coordinador tiene
  un programa válido.
- **CA-014.3** La contraseña no se persiste en texto plano. Sale en la
  respuesta HTTP solo hacia un administrador, una vez, al crearla o al
  generar una nueva, con `Cache-Control: no-store`.
- **CA-014.4** *(reemplazado)* Si el correo institucional falla, la cuenta
  se queda y el administrador usa otra opción de entrega.
- **CA-014.9** El envío por correo institucional solo acepta la clave
  temporal vigente de ese usuario (se compara con el hash): no sirve para
  mandar texto arbitrario con el remitente de CECAR, ni para reenviar una
  clave que el usuario ya cambió.
- **CA-014.10** **Nueva clave** invalida la anterior, vuelve a exigir el
  cambio en el primer ingreso y no se ofrece para la propia cuenta del
  administrador ni para usuarios inactivos.
- **CA-014.5** Con `AUTH_PROVEEDOR=local`, una clave creada por el administrador
  permite iniciar sesión y una errada no.
- **CA-014.6** *(retirado)* `CREDENCIALES_ENTREGA` y
  `PERMITIR_CREDENCIALES_PRUEBA` ya no existen: mostrar la clave al
  administrador es el comportamiento normal.
- **CA-014.7** En una instalación anterior sin hashes, el administrador demo
  puede entrar una vez con su clave publicada para establecer su clave propia;
  al hacerlo se reemplaza por un hash y la clave publicada deja de servir.
- **CA-014.8** Un coordinador creado con credencial temporal debe reemplazarla
  en su primer ingreso. Mientras no lo haga, no puede navegar ni modificar la
  información de asignaciones.

## Configuración

`SMTP_HOST`, `SMTP_PUERTO`, `SMTP_USUARIO`, `SMTP_CLAVE`, `SMTP_DESDE` y
`SMTP_SEGURO` se definen solo en el servidor y son opcionales: sin ellos
no aparece la opción "Correo institucional". El equipo de infraestructura
entrega los valores del relay SMTP de CECAR; no se incluyen claves reales en
el repositorio.
