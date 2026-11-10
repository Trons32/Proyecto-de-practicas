# SPEC-014 · Usuarios y credenciales locales

**Estado:** en implementación · **Prioridad:** P0 · **Depende de:** SPEC-008, SPEC-011

## Problema

El administrador no puede habilitar coordinadores ni entregarles una clave de
acceso. Para las pruebas se necesita administrar esos accesos desde la
aplicación y notificar la credencial inicial al correo institucional.

## Solución

- `/admin/usuarios` permite solamente al administrador crear cuentas,
  activar/desactivar accesos y asignar el programa de cada coordinador.
- Al crear una cuenta se genera una clave temporal en el servidor, se guarda
  únicamente su hash `scrypt` y se envía por SMTP al correo `@cecar.edu.co`.
  La API nunca devuelve la clave al navegador.
- El administrador puede fijar su propia clave desde el mismo módulo. Así se
  puede pasar de la validación institucional o de prueba a `AUTH_PROVEEDOR=local`
  sin un acceso oculto de inicialización.
- `AUTH_PROVEEDOR` conserva `api` y `prueba`; el nuevo valor `local` valida la
  clave contra el hash de `public.usuario`.

## Criterios de aceptación

- **CA-014.1** Un coordinador no puede listar ni crear usuarios, aunque llame
  la API directamente.
- **CA-014.2** Solo se crean correos institucionales y cada coordinador tiene
  un programa válido.
- **CA-014.3** La contraseña no se persiste en texto plano ni sale en la
  respuesta HTTP; el destinatario la recibe solamente por correo SMTP.
- **CA-014.4** Si SMTP rechaza el mensaje, la cuenta nueva se elimina y la API
  informa el error; no queda un acceso que el coordinador no conoce.
- **CA-014.5** Con `AUTH_PROVEEDOR=local`, una clave creada por el administrador
  permite iniciar sesión y una errada no.
- **CA-014.6** `CREDENCIALES_ENTREGA=prueba` muestra la clave temporal una vez
  al administrador para pruebas sin SMTP. En producción exige además
  `PERMITIR_CREDENCIALES_PRUEBA=1`, una decisión explícita y temporal.

## Configuración

`SMTP_HOST`, `SMTP_PUERTO`, `SMTP_USUARIO`, `SMTP_CLAVE`, `SMTP_DESDE` y
`SMTP_SEGURO` se definen solo en el servidor. El equipo de infraestructura
entrega los valores del relay SMTP de CECAR; no se incluyen claves reales en
el repositorio.
