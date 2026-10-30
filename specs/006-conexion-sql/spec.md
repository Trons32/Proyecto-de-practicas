# SPEC-006 · Conexión a SQL Server

**Estado:** implementada; la autenticación la completa SPEC-008 · **Prioridad:** P1 · **Motor:** SQL Server

## Problema

SPEC-002 dejó el esquema, la semilla y el punto único de almacenamiento,
pero la aplicación sigue guardando en el navegador: lo que registra un
coordinador solo existe en su equipo y el administrador no lo ve. La
universidad usa SQL Server y ya hay una base local en Docker
(`db/docker-compose.yml`).

## Alcance

1. **API de estado** (`app/api/estado/[clave]`): `GET` lee de SQL Server
   y devuelve cada store con la forma que espera `persist`; `PUT`
   escribe en una transacción.
2. **Adaptador remoto** en `lib/datos/almacen.ts`, activado con
   `NEXT_PUBLIC_ALMACEN=sql`. Sin la variable, todo sigue en localStorage
   como hasta ahora.
3. **Ids siempre UUID**: `tipos.ts` deja de generar ids cortos en
   contextos sin `crypto.randomUUID` (http dentro de la red de la
   universidad), porque la base los guarda como `UNIQUEIDENTIFIER`.

Fuera de alcance, y por eso **no apto para producción** todavía:

- **Autenticación de la API.** Depende de la reunión con sistemas
  (credenciales de Aldea). Hoy cualquiera que alcance el servidor puede
  leer y escribir. La API solo responde si `ALMACEN=sql` está definido en
  el servidor.
- **Un endpoint por acción** (`enviar`, `aprobar`…) con las reglas del
  ciclo de vida validadas en el servidor. SPEC-002 ya lo anticipaba; aquí
  el servidor guarda lo que el store decidió.

### Decisión: el cliente envía solo lo que cambió

`persist` entrega el estado entero en cada cambio. Reenviarlo completo haría
que el último en guardar borrara las asignaciones que otro coordinador
creó mientras tanto. El adaptador recuerda lo último leído o escrito y
envía solo las asignaciones y novedades que cambiaron, y los ids que
desaparecieron. Los `PUT` van en cola, en orden: un evento de reapertura
apunta a una novedad que tiene que existir antes.

### Decisión: si no se pudo leer, no se escribe

Si el `GET` falla, el store se hidrata con sus valores por defecto. Escribir
eso encima de la base reemplazaría la parametrización real por la del
formato. El adaptador marca esa clave como desconectada y no escribe hasta
recargar la página.

## Reglas

- La bitácora y las novedades solo reciben `INSERT` (el esquema lo impone
  por trigger): el servidor inserta los eventos y decisiones que no estaban.
- Los docentes de una asignación se reescriben enteros en cada guardado: es
  un agregado, y sus cursos y actividades se borran en cascada.
- Eliminar una asignación borra también su bitácora (excepción ya prevista
  en el esquema).
- Un documento repetido en un borrador no rompe el guardado: el segundo no se
  enlaza a la persona (`docente_id` NULL) hasta que se corrija.

## Criterios de aceptación

- **CA-006.1** Sin `NEXT_PUBLIC_ALMACEN=sql`, la aplicación se comporta
  igual que antes y la API responde 503.
- **CA-006.2** Con la variable, una asignación creada por el coordinador
  aparece al iniciar sesión como administrador en otro navegador.
- **CA-006.3** Leer de la base y volver a escribir lo leído no cambia nada
  (ida y vuelta estable).
- **CA-006.4** Dos clientes que crean asignaciones distintas no se borran
  entre sí.
- **CA-006.5** Si el servidor rechaza un guardado, el usuario lo ve
  (notificación) y no se pierde lo que está en pantalla.
- **CA-006.6** Si la base no responde al cargar, no se sobrescribe nada.

## Evidencia

- CA-006.3 y CA-006.4: `src/lib/servidor/verificar-sql.ts`, contra la base
  de Docker, con los 45 docentes del formato.
- CA-006.1, .2, .5 y .6: prueba manual con los dos roles.
