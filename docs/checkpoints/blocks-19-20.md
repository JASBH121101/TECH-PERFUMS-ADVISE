# JBAE — CHECKPOINT DE PROYECTO
## Bloques 17–20: IMPLEMENTACIÓN COMPLETADA / CERTIFICACIÓN PENDIENTE

Fecha de checkpoint: 2026-11-27 (UTC)

## 1. Identidad y protección del proyecto

- Proyecto: JB Advisor Engine (JBAE).
- Repositorio: `JASBH121101/TECH-PERFUMS-ADVISE`.
- Rama de trabajo: `feature/jbae-android-certification`.
- PR: #7 — OPEN / DRAFT / NOT MERGED.
- Rama base del PR: `feature/jbae-standalone-android-app`.
- `main`: intacta; SHA verificado: `b6b75050f63825c217e81a15957b9dd83a8745ca`.
- Commit fuente que contiene la implementación de los bloques 19–20: `dd63fe6f20f1fbbc8db1769215af3ea3026c7ed0`.
- No cambiar de rama, no cerrar ni fusionar el PR y no modificar `main` sin autorización expresa.

## 2. Alcance obligatorio

JBAE es exclusivamente un asesor de perfumería y catálogo de fragancias.

- No convertirlo en tienda, ecommerce, ERP, inventario, control de existencias, pedidos, precios, pagos o sistema de ventas.
- No integrar JBAE en otra página comercial o catálogo de negocio.
- Los datos de la biblioteca se usan como fuente para buscar, comparar y explicar fragancias.
- Las solicitudes y preferencias expresadas durante una consulta son temporales; no crear registros de clientes ni persistir automáticamente esas solicitudes.
- No inventar notas, familias, concentraciones, rendimiento, duración en horas ni características que no figuren en la ficha.

## 3. Release certificada de referencia

Última release Android certificada antes de los bloques 17–20:

- Versión: `v0.4.138`; `versionCode=138`.
- APK: https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/releases/download/jbae-v0.4.138/JBAE.apk
- SHA-256: `1c75aa2e4ece5c4983b86ad83f338535f77d2a57add500dd5383c3a406aafc1a`.

Esta release es únicamente la referencia anterior. **No existe una nueva APK declarada como certificada para los bloques 17–20.**

## 4. Bloques 17–18 — completados en la fase anterior

### Bloque 17 — QA lingüístico del catálogo

- Ampliación de terminología española de notas y descriptores de carácter.
- Preservación de nombres comerciales de perfumes, marcas y materiales propietarios reconocidos.
- Términos sin equivalencia fiable permanecen en la forma fuente y quedan señalados para revisión humana.
- Auditoría del catálogo de fragancias y cobertura del snapshot CSV de 1,479 productos.
- Búsqueda, fichas y comparaciones con etiquetas españolas donde existe equivalencia.

### Bloque 18 — UX compacta del asesor y catálogo

- Pestañas compactas para Asesor, Buscar, Colección y Comparar.
- Formularios y tarjetas más compactos sin eliminar la legibilidad ni los controles táctiles.
- Explicaciones de recomendación plegables con coincidencias, diferencias, ausencias y cobertura.
- Búsqueda con accesos rápidos y terminología localizada.
- Fichas y matriz comparativa compactas con detalles secundarios desplegables.

Checkpoint previo: `docs/checkpoints/blocks-17-18.md`.

## 5. Bloque 19 — Interpretación avanzada y contradicciones

Implementado en `src/domains/fragrance/intent.js`, `apps/mobile/src/personalization.js` y la interfaz móvil.

- La polaridad se analiza por mención, para distinguir términos positivos y negativos aunque aparezcan en frases diferentes.
- Reconoce contradicciones entre día/noche, clima caliente/frío e intensidad suave/fuerte.
- Detecta cuando una misma familia, nota o descriptor de carácter se solicita y también se rechaza.
- Los conflictos se devuelven como datos estructurados con una pregunta de aclaración.
- Cuando existe un conflicto, el asesor bloquea el ranking: devuelve `needs_preferences` con `match: null`; no escoge silenciosamente una de las condiciones.
- La interfaz muestra la contradicción y pide al usuario aclararla antes de recomendar.
- El contexto de oficina no se interpreta por sí solo como una obligación de uso diurno; una solicitud de oficina por la noche sigue siendo válida.
- Las solicitudes no se guardan como perfiles ni registros permanentes.

## 6. Bloque 20 — Modificadores comparativos basados en catálogo

Implementado mediante `resolveFragranceReferenceModifiers()`, exportado desde `src/index.js` e integrado en el asesor.

- Los modificadores «más suave», «más fresco», «menos dulce», «más dulce», «más intenso» y «menos amaderado» se convierten en criterios de búsqueda explícitos.
- «Más suave que [referencia]» solo obtiene límites comparativos de intensidad, proyección y estela cuando la ficha local de referencia contiene esos niveles ordinales.
- Los límites se derivan de un nivel inferior al valor registrado en la referencia; no se inventan puntuaciones ni horas.
- Los campos ausentes o no comparables se registran como no verificables. La interfaz informa qué ajuste se aplicó y qué parte no se pudo verificar.
- Las referencias desconocidas o ambiguas no generan atributos olfativos ficticios.
- Una solicitud de larga duración no se convierte en un número de horas no documentado.

## 7. Pruebas de regresión añadidas

Añadidas, pero **no ejecutadas todavía como certificación**:

- `tests/fragrance-intent.test.js`: 10 regresiones de contradicciones por ocasión, familia, nota, carácter, clima e intensidad, además de modificadores relativos con y sin atributos de referencia.
- `apps/mobile/tests/personalization.test.js`: 3 regresiones para bloqueo de recomendaciones, aplicación de límites comparativos y comportamiento ante datos insuficientes.
- `apps/mobile/tests/main-flow-hardening.test.js`: 2 contratos de interfaz para mostrar aclaraciones y transparentar modificadores aplicados/no verificables.

No presentar estos tests como aprobados hasta ejecutar la etapa de certificación y revisar los resultados reales.

## 8. Orden obligatorio de las siguientes etapas

1. **Terminar la implementación de los bloques** — esta etapa deja implementados los bloques 17, 18, 19 y 20 y sus regresiones.
2. **Certificar el lote completo** — ejecutar pruebas del motor, pruebas móviles, build y workflow Android firmado; verificar versión, certificado, artefacto y correspondencia del APK publicado.
3. **Reparar cualquier fallo** — corregir la causa raíz y volver a ejecutar la certificación afectada y las regresiones relacionadas. No avanzar con fallos abiertos.
4. **Implementación/publicación y fusión** — únicamente después de la certificación satisfactoria, revisión del artefacto y autorización correspondiente. No fusionar automáticamente.

Pendiente además la revisión visual en un Android físico; una aprobación de CI no la sustituye.

## 9. Estado al cierre

- Bloques 17–20: IMPLEMENTACIÓN COMPLETADA.
- Regresiones: AÑADIDAS / EJECUCIÓN DE CERTIFICACIÓN PENDIENTE.
- Nueva APK: NO DECLARADA.
- Release certificada vigente: v0.4.138.
- PR #7: OPEN / DRAFT / NOT MERGED.
- `main`: sin modificaciones.
- Siguiente actividad: iniciar certificación del lote 17–20; reparar y volver a certificar si alguna comprobación falla.
