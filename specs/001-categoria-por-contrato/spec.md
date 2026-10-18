# SPEC-001 · Categoría según contrato y dedicación

**Estado:** implementada · **Prioridad:** P0

## Problema

Con contrato TÉRMINO_INDEFINIDO y dedicación TIEMPO_COMPLETO el formato
oficial ofrece cuatro categorías; el sistema ofrecía dos (AUXILIAR,
ASISTENTE), y para MEDIO_TIEMPO las otras dos (ASOCIADO, TITULAR).

## Lo que dice el Excel

| Columna             | Validación            | Significado                                  |
| ------------------- | --------------------- | -------------------------------------------- |
| I · Tipo contrato   | `=CONTRATO`           | seis contratos                               |
| J · Dedicación      | `=INDIRECT($I9)`      | depende del contrato                         |
| K · Categoría       | `=INDIRECT($J9)`      | depende **solo de la dedicación**            |

| Rango con nombre | Celdas      | Categorías                                  |
| ---------------- | ----------- | ------------------------------------------- |
| TIEMPO_COMPLETO  | `EA9:EA12`  | AUXILIAR, ASISTENTE, ASOCIADO, TITULAR      |
| MEDIO_TIEMPO     | `EA13:EA16` | AUXILIAR, ASISTENTE, ASOCIADO, TITULAR      |
| HORA_CÁTEDRA     | `EA17:EA21` | CATEGORÍA I, II, III, IV, ÚNICA             |
| HORA_LABOR       | `EA17:EA21` | CATEGORÍA I, II, III, IV, ÚNICA             |

**Causa raíz:** el catálogo se armó leyendo la tabla de apoyo (EA/EC/EE) fila
por fila, lo que emparejó cada categoría con una dedicación. El Excel valida
por rango con nombre, no por fila. El formato real registra un
`TÉRMINO_INDEFINIDO · MEDIO_TIEMPO · ASISTENTE`, imposible con el catálogo
anterior.

Excel no borra la categoría al cambiar el contrato: la fila 9 de la captura
del cliente (`TÉRMINO_INDEFINIDO · TIEMPO_COMPLETO · CATEGORÍA III`) es ese
defecto, no una combinación válida.

## Reglas

1. Las dedicaciones dependen del contrato.
2. Las categorías dependen de la dedicación.
3. TÉRMINO_FIJO y TÉRMINO_INDEFINIDO, en TIEMPO_COMPLETO o MEDIO_TIEMPO,
   ofrecen AUXILIAR, ASISTENTE, ASOCIADO y TITULAR.
4. LABOR_CONTRATADA, CÁTEDRAS, TUTOR_VIRTUAL y TUTOR_EAD ofrecen
   CATEGORÍA I, II, III, IV y ÚNICA.
5. Cambiar el contrato vacía dedicación y categoría; cambiar la dedicación
   vacía la categoría.
6. El motor de validación rechaza una combinación fuera de la cascada.

## Criterios de aceptación

- **CA-001.1** Dado TÉRMINO_INDEFINIDO, cuando se elige TIEMPO_COMPLETO,
  entonces Categoría ofrece exactamente las cuatro del escalafón.
- **CA-001.2** Dado TÉRMINO_FIJO, cuando se elige MEDIO_TIEMPO, entonces
  ofrece las mismas cuatro.
- **CA-001.3** Dado CÁTEDRAS, cuando se elige HORA_CÁTEDRA, entonces ofrece
  CATEGORÍA I–IV y ÚNICA.
- **CA-001.4** Dado un docente con categoría fuera de su dedicación, cuando
  se valida, entonces hay un error en `categoria`.
- **CA-001.5** Dadas las siete combinaciones reales del formato, cuando se
  corre `verificar.ts`, entonces todas se aceptan.

## Evidencia

- `src/lib/catalogos.ts` — `ESCALAFON` en las dedicaciones de planta.
- `src/lib/calculo.ts` — `validarDocente` comprueba la cascada.
- `src/lib/verificar.ts` — CA-001.4 y CA-001.5.
- `src/components/FormularioDocente.tsx` — ya vaciaba los campos (regla 5).

## Pendiente con el cliente

Confirmar que TÉRMINO_FIJO y TÉRMINO_INDEFINIDO comparten escalafón: el
Excel no los distingue.
