# JBAE — Bloque 7: auditoría de integración de bloques 1–6

**Corte de auditoría:** 2026-11-21  
**Rama de auditoría:** `feature/jbae-integration-audit`  
**Base:** `feature/jbae-integrated-flow-hardening`  
**Commit base del Bloque 6:** `4dce89cbebee41b815199764240e12b9aaaa4306`

## 1. Cadena de integración comprobada

Los cinco PR de implementación permanecen abiertos como Draft, sin merge y con estado `mergeable_state=clean`. La relación base/head está encadenada en el orden esperado:

| Secuencia | PR | Rama head | Rama base | Commit head | Estado |
|---|---:|---|---|---|---|
| Base Android | — | `feature/jbae-standalone-android-app` | `main` (sin cambio) | `965fae8e38dbc351e23ded7d364490f7e5b1b411` | Base de trabajo |
| Bloque 2 | #1 | `feature/jbae-olfactory-multi-preferences` | `feature/jbae-standalone-android-app` | `ff19a6aa0a663e160a0c4372728e4a40517ad026` | Draft / clean |
| Bloque 3 | #2 | `feature/jbae-olfactory-profile` | `feature/jbae-olfactory-multi-preferences` | `fec5c1d7cd235fe168c08703602a82c5a71c58fa` | Draft / clean |
| Bloque 4 | #3 | `feature/jbae-fragrance-collection` | `feature/jbae-olfactory-profile` | `b6a21f9826afa40c0c0dc2e5a83730619f465466` | Draft / clean |
| Bloque 5 | #4 | `feature/jbae-collection-management` | `feature/jbae-fragrance-collection` | `09157e76355af9da16838c5cd4344336206c1205` | Draft / clean |
| Bloque 6 | #5 | `feature/jbae-integrated-flow-hardening` | `feature/jbae-collection-management` | `4dce89cbebee41b815199764240e12b9aaaa4306` | Draft / clean |

Los PR #1–#5 fueron consultados en GitHub y todos devolvieron `state=open`, `draft=true`, `merged=false`, `mergeable=true`, `mergeable_state=clean`. Cada rama head coincide exactamente con la rama base del PR siguiente. El Bloque 7 se deriva del commit final del Bloque 6; no reescribe ni integra ramas anteriores.

## 2. Compatibilidad funcional cubierta

| Dominio | Integración esperada | Evidencia automatizada |
|---|---|---|
| FRAGRANCE | Texto natural + familias/notas múltiples + perfil | Tests de personalización y del motor |
| FRAGRANCE | Valoraciones y aprendizaje a partir de productos distintos | Tests de perfil/aprendizaje |
| FRAGRANCE | Favoritos, estados y notas personales | Tests KnowledgeStore de perfil/colección |
| FRAGRANCE | Filtros, búsqueda normalizada y selección 2–4 | Tests de colección y comparación |
| FRAGRANCE | Matriz descriptiva sin ganador universal | Tests de comparación |
| TECH | Consulta y comparación de fichas con cobertura/conflictos | Tests de lookup, proveedores y comparador |
| TECH | Invalidación de solicitudes obsoletas | Tests de request guard e integración UI |
| Persistencia | Migraciones, backup y reapertura con adaptador simulado | Tests KnowledgeStore / SQLite adapter |
| Navegación | Las pantallas y modos no aceptan resultados de consultas caducadas | Tests de endurecimiento del flujo |

El nuevo test `apps/mobile/tests/integrated-flows.test.js` recorre con datos sintéticos el flujo completo de FRAGRANCE: catálogo → perfil → recomendaciones → feedback → favoritos/colección → reapertura del KnowledgeStore simulado → búsqueda → comparación.

## 3. Validación acumulada previa a este bloque

Commit validado del Bloque 6: `4dce89cbebee41b815199764240e12b9aaaa4306`.

Run de GitHub Actions: [#44924183032](https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/actions/runs/44924183032)

- Motor: 393/393 pruebas aprobadas.
- App móvil: 99/99 pruebas aprobadas.
- Sintaxis JavaScript, build web y construcción del seed offline: correctos.
- Seed reportado: 1,479 perfumes, 160 casas, 420 materiales y 20,280 registros de evidencia.

El CI del Bloque 7 agrega una prueba integrada real sobre el adaptador de memoria. Esto mejora la verificación del contrato entre módulos, pero no debe confundirse con prueba instrumental en Android.

## 4. Riesgos y límites que siguen abiertos

1. **SQLite nativo en teléfono/emulador:** no se certificó instalación real, importación inicial sobre SQLite plugin, cierre/reapertura, terminación forzada y recuperación de proceso.
2. **Actualizador Android:** las pruebas unitarias no sustituyen una descarga real, validación de APK, continuidad del certificado e instalación confirmada por Android.
3. **PWA:** el service worker y shell web tienen pruebas; la vista previa continúa usando memoria temporal para el estado de conocimiento.
4. **TECH en entorno real:** los tests validan parsers, contrato de proveedores y resultados simulados; la disponibilidad externa y calidad de cada proveedor deben comprobarse en una sesión real.
5. **Datos olfativos:** el seed es información reportada y la presencia de campos no certifica exactitud sensorial.

## 5. Criterio de salida del Bloque 7

Este bloque puede cerrarse cuando:
- La prueba integrada acumulativa pase en CI.
- Las pruebas previas del motor y la app móvil continúen sin regresiones.
- Los cinco PR permanezcan encadenados y sin conflictos reportados.
- El PR de auditoría quede abierto como Draft.
- `main` siga en `b6b75050f63825c217e81a15957b9dd83a8745ca`.

**Decisión:** la integración lógica entre ramas está preparada y verificada por CI; la certificación de producto Android sigue condicionada a pruebas físicas. No declarar el motor completamente certificado ni fusionar hacia `main` mientras esos ensayos y la autorización correspondiente estén pendientes.
