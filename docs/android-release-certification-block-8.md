# JBAE — Bloque 8: certificación y distribución Android

**Rama:** `feature/jbae-android-certification`  
**Base:** `feature/jbae-standalone-android-app`  
**Punto de partida:** PR #6 / commit `2d345f0f95c53635f755a4140fa2f400ef66df94`  
**Versión ya publicada antes del bloque:** `0.4.83`, `versionCode=83`, tag `jbae-v0.4.83`.

## 1. Alcance de entrega

Este bloque prepara y valida el paquete Android final que contiene el trabajo encadenado de los bloques 1–7:

- Motor JBAE integrado con FRAGRANCE y TECH.
- Perfil, preferencias, valoraciones, favoritos y colección personal.
- Búsqueda y comparación de fragancias.
- Base local SQLite y carga inicial del seed.
- Actualizador nativo Android con DownloadManager.
- Validación de paquete, versión, tamaño y continuidad del certificado.
- Distribución directa desde GitHub Releases y artefacto de Actions.

No convierte la vista previa PWA en una app con persistencia. En navegador la biblioteca sigue siendo temporal; el almacenamiento SQLite se usa en el paquete Android.

## 2. Identidad y versión que no se deben alterar

| Campo | Valor / política |
|---|---|
| Application ID | `com.jb.advisor.mobile` |
| Nombre Android | `JBAE` |
| Versión base | `0.4.0` |
| Versión publicada | `MAJOR.MINOR.GITHUB_RUN_NUMBER` |
| versionCode | Contador monotónico `GITHUB_RUN_NUMBER` |
| Release tag | `jbae-vMAJOR.MINOR.GITHUB_RUN_NUMBER` |
| APK asset | `JBAE.apk` |
| Firma nueva | Keystore PKCS#12 `jbae-release.p12`, cargado desde secretos protegidos de Actions |

La última publicación verificada antes de iniciar este bloque es `jbae-v0.4.83`, con `versionCode=83`. El siguiente build debe resolver un `versionCode` mayor; nunca se debe reiniciar el contador para forzar una versión anterior.

La firma histórica de `jbae-v0.4.83` procede de un keystore debug dedicado a JBAE; no es una clave de publicación de Google Play. La caché histórica se perdió. El usuario autorizó el reemplazo de identidad el 21-11-2026. La nueva clave será PKCS#12 con alias `jbae-release-2026`, contraseña protegida y respaldo cifrado fuera del repositorio. No es compatible como actualización directa sobre la instalación histórica.

## 3. Puertas de validación del pipeline

1. Ejecutar tests móviles y tests del motor.
2. Construir el catálogo TECH y seed de FRAGRANCE offline.
3. Construir el bundle web de Capacitor.
4. Generar el proyecto Android y sincronizar los plugins.
5. Registrar el actualizador nativo, permiso de instalación y reglas de shrinker.
6. Reconstruir el keystore PKCS#12 desde secretos protegidos; validar alias, contraseña y huella del certificado.
7. Compilar `assembleRelease`.
8. Verificar firma con `apksigner`, Application ID, `versionCode` y `versionName`.
9. Publicar `JBAE.apk` en GitHub Releases.
10. Descargar el asset recién publicado y comparar sus bytes con el APK que salió de la compilación.
11. Conservar un artefacto de Actions por 14 días para diagnóstico.

El tag y la URL deben pertenecer exclusivamente al canal JBAE. El actualizador de JS y el plugin Java rechazan enlaces ajenos al repositorio/tag oficiales.

## 4. Seguridad del actualizador nativo

El actualizador requiere:
- URL HTTPS oficial de GitHub y ruta exacta `/releases/download/jbae-vX.Y.Z/JBAE.apk`.
- Paquete `com.jb.advisor.mobile`.
- Coincidencia de versión solicitada y versión interna del APK.
- Confirmación de que DownloadManager terminó y que los bytes descargados coinciden con el tamaño anunciado.
- Igualdad del conjunto de hashes SHA-256 de los certificados instalados y descargados.
- Permiso Android para instalar desde JBAE cuando el sistema lo requiera.
- Acción explícita del instalador Android; no existe instalación silenciosa.

Los datos locales se conservan en actualizaciones futuras firmadas con el nuevo certificado y el mismo Application ID. La primera instalación con el certificado nuevo **no puede instalarse encima de la versión histórica**: Android la rechazará por diferencia de firma. La transición requiere desinstalar la versión histórica y después instalar el APK nuevo; la desinstalación elimina los datos privados locales, incluida la base SQLite. No hay migración automática disponible. La base SQLite no usa SQLCipher en esta fase.

## 5. Incidencia histórica y transición a nueva firma

**Run de Android:** #44926388190  
**Versión calculada:** `0.4.85` / `versionCode=85` (no publicada).  
**Última Release histórica:** `jbae-v0.4.83`, firmada con el certificado anterior.

El run #85 se detuvo antes de Gradle y antes de firmar porque GitHub informó `Cache not found for input keys: jbae-android-signing-v1-Linux`. La pantalla del repositorio confirmó 0 cachés disponibles. La ejecución #83 del 9 de noviembre había restaurado correctamente esa clave; el artefacto de esa ejecución contenía únicamente el APK y no el keystore privado.

El usuario autorizó crear una identidad de firma nueva el 21-11-2026. La nueva firma no puede actualizar directamente la instalación histórica porque Android requiere que una actualización mantenga el certificado del paquete instalado. La transición requiere desinstalar la versión anterior y aceptar la eliminación de sus datos privados locales. La nueva firma conservará el mismo Application ID; una vez instalada limpiamente, las siguientes actualizaciones podrán instalarse encima con la nueva identidad.

### Generación, configuración y custodia de la nueva identidad

La identidad se generó fuera del repositorio y se validó como PKCS#12 con alias `jbae-release-2026`, RSA de 3072 bits y vigencia de 10,000 días. Huella pública SHA-256:

`4A0CD130AF30B9D6EEE5FF1D10F725E5B3DAB26199622782ACE243F980052CC1`

Los secretos protegidos `JBAE_ANDROID_KEYSTORE_PASSWORD` y `JBAE_ANDROID_SIGNING_KEYSTORE_BASE64` quedaron configurados en el repositorio. La ejecución Android #86 los reconstruyó y validó correctamente; sus valores no se registran en el repositorio ni en los logs.

### Resultado de publicación — 21-11-2026

- Release: [`jbae-v0.4.86`](https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/releases/tag/jbae-v0.4.86).
- APK: [`JBAE.apk`](https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/releases/download/jbae-v0.4.86/JBAE.apk).
- Versión: `0.4.86`; `versionCode=86`.
- Tamaño del asset: 12,911,588 bytes.
- Workflow Android #44933553687: éxito.
- CI del mismo commit #44933553652: éxito.
- Pruebas móviles y del motor: éxito.
- Keystore PKCS#12, alias y contraseña: validados.
- `assembleRelease`, firma, huella SHA-256, Application ID y versión: verificados.
- Asset de GitHub Releases descargado y comparado byte por byte con el APK compilado: coincidencia.

La Release histórica `jbae-v0.4.83` permanece disponible con el certificado anterior. La nueva firma no puede instalarse encima de esa instalación: Android exige una instalación limpia y la desinstalación elimina los datos privados locales, incluida SQLite. No desinstalar la aplicación histórica sin aceptar esa pérdida y sin respaldar previamente cualquier dato necesario.

## 6. Verificación que puede hacer CI y lo que todavía exige teléfono

### CI puede certificar
- Integridad de sintaxis y tests del motor/móvil.
- Construcción reproducible dentro del workflow configurado.
- Generación del APK release.
- Firma válida, paquete y versión declarados.
- Asset publicado idéntico al APK compilado.
- Reglas de aceptación de URL/certificado del actualizador verificadas por tests de contrato.

### Un teléfono real todavía debe certificar
- Instalación limpia desde el APK descargado.
- Primer arranque e importación real del seed en SQLite nativo.
- Cierre forzado, reapertura y persistencia de perfil, feedback, favoritos, colección y notas.
- Reinicio del teléfono y recuperación de base local.
- Descarga del actualizador con DownloadManager.
- Permiso de «Permitir desde esta fuente», retorno a JBAE y confirmación del instalador.
- Actualización encima de una versión anterior con datos conservados.
- Inicio y consulta básica TECH/FRAGRANCE después de actualizar.
- Funcionamiento sin conexión de búsqueda y funciones que usan la biblioteca local.

Un test sobre `MemoryKnowledgeAdapter` o un build APK exitoso no prueba el comportamiento del plugin SQLite en un teléfono. Tampoco se debe llamar «certificado físicamente» hasta completar esta lista.

## 7. Checklist de prueba del usuario en Android

APK disponible: [JBAE v0.4.86](https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/releases/download/jbae-v0.4.86/JBAE.apk). La validación automática de CI y publicación ya está aprobada; esta lista es exclusivamente la certificación física pendiente:

- [ ] Registrar marca/modelo del teléfono y versión Android.
- [ ] Instalar JBAE sin una copia anterior, abrir y esperar a que cargue la biblioteca.
- [ ] Abrir FRAGRANCE y buscar un perfume conocido del seed.
- [ ] Guardar una preferencia y valorar un perfume.
- [ ] Marcar un favorito, añadir a colección y guardar una nota privada.
- [ ] Forzar detención desde Ajustes → Aplicaciones → JBAE → Forzar detención.
- [ ] Reabrir JBAE y confirmar que los datos anteriores siguen presentes.
- [ ] Reiniciar el teléfono y repetir la comprobación.
- [ ] Antes de instalar el primer APK de la nueva firma, registrar que desinstalar la versión histórica elimina sus datos privados locales; no continuar si esos datos deben conservarse.
- [ ] Desinstalar la versión histórica e instalar limpiamente el primer APK de la nueva firma.
- [ ] Confirmar que la pantalla de Android muestra JBAE y la versión esperada.
- [ ] En una versión posterior firmada con la nueva clave, probar actualización encima y comprobar persistencia del perfil y la colección.
- [ ] Probar una búsqueda FRAGRANCE en modo avión; anotar las funciones online TECH como no disponibles offline.

Registrar versión, `versionCode`, teléfono, versión Android, paso y resultado cuando algo falle.

## 8. Criterio de salida del Bloque 8

**Aprobado en CI y distribución:** el workflow Android #86 compiló y firmó el APK con la nueva identidad, verificó la huella del certificado, el Application ID, la versión y la firma, publicó `jbae-v0.4.86` y confirmó la igualdad byte por byte del asset publicado. El CI #458 del mismo commit también terminó con éxito.

**Pendiente para cierre físico:** instalar y probar el APK en un teléfono real, verificar importación/persistencia SQLite, reapertura, reinicio, funcionamiento offline y flujo del actualizador. La transición desde la versión histórica exige instalación limpia y pérdida de los datos locales anteriores; no debe iniciarse sin aceptar esa consecuencia.

El PR #7 permanece abierto en Draft y no se ha fusionado. `main` sigue intacta. No se debe afirmar certificación física hasta completar los puntos de la sección 6.
