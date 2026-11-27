# JBAE — CHECKPOINT DE PROYECTO
## Bloques 17–20: IMPLEMENTACIÓN COMPLETADA / CERTIFICACIÓN AUTOMÁTICA APROBADA / VALIDACIÓN FÍSICA PENDIENTE

Fecha de checkpoint: 2026-11-27 (UTC)

## 1. Identidad y protección del proyecto

- Proyecto: JB Advisor Engine (JBAE).
- Repositorio: `JASBH121101/TECH-PERFUMS-ADVISE`.
- Rama de trabajo: `feature/jbae-android-certification`.
- PR: #7 — OPEN / DRAFT / NOT MERGED.
- Rama base del PR: `feature/jbae-standalone-android-app`.
- `main`: intacta; SHA verificado: `b6b75050f63825c217e81a15957b9dd83a8745ca`.
- Commit fuente de la implementación de los bloques 19–20: `dd63fe6f20f1fbbc8db1769215af3ea3026c7ed0`.
- Commit de código/workflows certificado automáticamente: `44a8a0941d7f8498021cb90e10a42635ef0557d4`.
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

Esta release continúa siendo la última Release pública. La versión `0.4.161` se construyó y firmó para certificación y quedó como artefacto privado de GitHub Actions; no se publicó una Release pública.

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

Añadidas y ejecutadas como parte de la certificación automática:

- `tests/fragrance-intent.test.js`: 10 regresiones de contradicciones por ocasión, familia, nota, carácter, clima e intensidad, además de modificadores relativos con y sin atributos de referencia.
- `apps/mobile/tests/personalization.test.js`: 3 regresiones para bloqueo de recomendaciones, aplicación de límites comparativos y comportamiento ante datos insuficientes.
- `apps/mobile/tests/main-flow-hardening.test.js`: 2 contratos de interfaz para mostrar aclaraciones y transparentar modificadores aplicados/no verificables.

Resultado de la ejecución: todas las suites relacionadas finalizaron con éxito; el detalle de runs y artefactos está en la sección 10.

## 8. Orden obligatorio de las siguientes etapas

1. **Terminar la implementación de los bloques** — completado para los bloques 17–20.
2. **Certificación automática integral** — CI y build Android firmado completados con éxito; consultar la sección 10.
3. **Validación física** — pendiente instalación y pruebas reales en un dispositivo Android, incluyendo primer arranque, persistencia SQLite, navegación offline y flujo de actualización.
4. **Implementación/publicación y fusión** — no iniciadas. Solo después de aprobar la validación física y con autorización expresa; no fusionar automáticamente.

Pendiente además la revisión visual en un Android físico; una aprobación de CI no la sustituye.

## 9. Estado al cierre

- Bloques 17–20: IMPLEMENTACIÓN COMPLETADA.
- CI integral: SUCCESS; 476/476 pruebas del motor/root y 153/153 pruebas móviles aprobadas.
- Android Release workflow: SUCCESS; APK 0.4.161 firmada y verificada, subida como artefacto privado de Actions.
- Release pública vigente: v0.4.138; no se publicó una nueva Release.
- Validación física en Android: PENDIENTE.
- PR #7: OPEN / DRAFT / NOT MERGED.
- `main`: sin modificaciones, SHA `b6b75050f63825c217e81a15957b9dd83a8745ca`.
- Siguiente actividad: validación física; no iniciar publicación/implementación/merge hasta que cierre correctamente.


## 10. Certificación automática — 2026-11-27

### Engine / CI
- Workflow: [JB Advisor Engine CI #45949795119](https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/actions/runs/45949795119) — SUCCESS.
- Commit examinado: `44a8a0941d7f8498021cb90e10a42635ef0557d4`.
- Sintaxis JavaScript: SUCCESS.
- Tests motor/root: 476 passed / 0 failed.
- Tests aplicación móvil: 153 passed / 0 failed.
- Build del bundle web: SUCCESS.
- Construcción del seed completo de conocimiento olfativo: SUCCESS.
- Artefacto del informe de cobertura: [fragrance-library-coverage](https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/actions/runs/45949795119/artifacts/15175294160).

### Android — compilación y firma
- Workflow: [JBAE Android Release #45949795137](https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/actions/runs/45949795137) — SUCCESS.
- Run number / versionCode: `161`.
- versionName: `0.4.161`.
- Package: `com.jb.advisor.mobile`.
- Gradle: `BUILD SUCCESSFUL`; ensamblado `assembleRelease` aprobado.
- Huella SHA-256 del certificado APK: `4A0CD130AF30B9D6EEE5FF1D10F725E5B3DAB26199622782ACE243F980052CC1`.
- La huella coincide con la identidad PKCS#12 protegida `jbae-release-2026`.
- SHA-256 del APK firmado: `004ba03eca43974ee46216feaaa41d56d4be72d66170b9c61ef0d4187a922b9d`.
- Verificación del identificador, versión y versionCode: SUCCESS.

### Artefacto privado y no publicación
- Artefacto: [JBAE-Android-v0.4.161](https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/actions/runs/45949795137/artifacts/15176298216).
- Artifact ID: `15176298216`.
- ZIP: 8,876,593 bytes; digest del ZIP: `sha256:fed650328df37ceb93caef4bcb214245381b824738e49cd0431ad42733259121`.
- El APK fue subido como artefacto de Actions con retención de 14 días.
- Los pasos «Publish installable APK release» y «Verify published APK asset» quedaron SKIPPED intencionalmente en `feature/jbae-android-certification`.
- La Release pública más reciente continúa siendo `jbae-v0.4.138`; su asset y hash no se modificaron.

### Pendiente antes de la implementación/publicación
- Instalación real de la APK certificada en un dispositivo Android.
- Primer arranque y navegación en FRAGRANCE.
- Persistencia SQLite, cierre/reapertura y reinicio.
- Modo offline y funcionamiento de actualización/instalador.
- Revisión visual de tipografía, espaciado y controles táctiles.
- Solo después de cerrar estos puntos se podrá autorizar la publicación y la fusión. PR #7 continúa OPEN / DRAFT / NOT MERGED; `main` permanece intacta.
