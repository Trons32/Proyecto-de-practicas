# SPEC-010 · Despliegue y credenciales por API

**Estado:** implementada (falta el contrato definitivo de la API) · **Prioridad:** P0 · **Depende de:** SPEC-006, SPEC-008

## Problema

La aplicación ya corre en `https://planificacionacademica.cecar.edu.co`, pero
con los usuarios de prueba y sin base. Sistemas entrega una API que valida
usuario y clave; falta conectarla y dejar el paso a SQL Server repetible.

## Solución

- `verificarCredenciales()` elige el proveedor con `AUTH_PROVEEDOR`:
  `api` (por defecto en producción) o `prueba`. Los usuarios de prueba
  tienen la clave publicada en el repo: en producción solo se activan si se
  pide a propósito.
- `lib/servidor/aldea.ts`: primero busca el correo en `public.usuario` (activo);
  si está, hace `POST AUTH_API_URL` con usuario y clave. Un 2xx valida,
  salvo que el cuerpo diga `valido|success|autenticado… = false`. Campos,
  token, dominio y espera se ajustan por entorno.
- La API valida la clave; **el rol lo decide `public.usuario`**. Estar en el
  directorio de la universidad no da acceso.
- `GET /api/salud`: sonda sin sesión que dice si la base responde con el
  esquema cargado y si hay secreto de sesión, sin revelar detalles.
- `db/crear-usuario-app.sql` crea el login de mínimo privilegio y
  `db/usuarios.ejemplo.sql` habilita a las personas.
- `DESPLIEGUE.md` lleva el paso a paso.

## Criterios de aceptación

- **CA-010.1** En producción sin `AUTH_PROVEEDOR`, los usuarios de prueba no entran.
- **CA-010.2** Clave válida en la API pero correo ausente o inactivo en `public.usuario`: no entra.
- **CA-010.3** API caída o lenta: el login responde "credenciales incorrectas" y no se cuelga.
- **CA-010.4** `/api/salud` responde 503 si la base no responde o falta el secreto.

## Evidencia

- CA-010.1 y el contrato de la API (2xx, `success=false`, 401, sin dominio):
  `src/lib/servidor/verificar-sesion.ts`.
- CA-010.2, .3 y .4: manual, en el servidor, siguiendo `DESPLIEGUE.md`.

## Pendiente con sistemas

- El contrato exacto de la API (URL, campos, respuesta, token). Si no cabe
  en las variables `AUTH_API_*`, se ajusta solo `consultarApi()`.
- De dónde sale el programa de cada coordinador.
