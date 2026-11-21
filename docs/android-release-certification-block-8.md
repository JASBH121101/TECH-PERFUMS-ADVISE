# JBAE — Bloque 8: certificación y distribución Android

**Rama:** `feature/jbae-android-certification`  
**Base:** `feature/jbae-integration-audit`  
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
| Firma | Keystore persistente de JBAE en caché protegida de Actions |

La última publicación verificada antes de iniciar este bloque es `jbae-v0.4.83`, con `versionCode=83`. El siguiente build debe resolver un `versionCode` mayor; nunca se debe reiniciar el contador para forzar una versión anterior.

La firma persistente actual procede de un keystore debug dedicado a JBAE. Sirve para actualizaciones directas fuera de Google Play, pero **no es una clave de publicación de Google Play**. Si se pierde la caché de firma, el workflow debe fallar de forma cerrada. No regenerar, borrar ni rotar la identidad.

## 3. Puertas de validación del pipeline

1. Ejecutar tests móviles y tests del motor.
2. Construir el catálogo TECH y seed de FRAGRANCE offline.
3. Construir el bundle web de Capacitor.
4. Generar el proyecto Android y sincronizar los plugins.
5. Registrar el actualizador nativo, permiso de instalación y reglas de shrinker.
6. Restaurar la clave persistente; fallar si falta el marcador de identidad o la clave no está disponible.
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

Los datos locales se conservan al instalar una actualización encima de la app instalada con el mismo Application ID y certificado. **No desinstalar la aplicación para actualizarla**: la desinstalación elimina los datos privados locales. La base SQLite no usa SQLCipher en esta fase.

## 5. Incidencia de firma detectada durante el Bloque 8

**Run de Android:** #44926388190  
**Versión calculada:** `0.4.85` / `versionCode=85` (no publicada).  
**Última Release oficial verificada:** `jbae-v0.4.83`.

El run #85 pasó:
- Tests móviles y del motor.
- Catálogo TECH y seed offline.
- Build web.
- Generación del proyecto Android, sincronización de Capacitor, instalación del plugin updater y verificación de insets nativos.
- Restauración de herramientas Java/Android.

El pipeline se detuvo en `Ensure stable signing identity`, antes de Gradle y antes de firmar. La línea de log dice `Cache not found for input keys: jbae-android-signing-v1-Linux`. Como el marcador `.github/jbae-android-signing-key-persisted` existe, el workflow se negó correctamente a crear otra clave. **No se compiló ni publicó un APK nuevo.**

La última ejecución exitosa que restauró la caché fue el run #83 del 9 de noviembre de 2026; el intento del Bloque 8 fue el 21 de noviembre. GitHub indica que las cachés no usadas durante más de siete días se eliminan por defecto. La caducidad es coherente con el cache miss observado, aunque una eliminación manual o por cuota también sería posible. Referencia: [política oficial de retención y eviction de cachés](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching#usage-limits-and-eviction-policy).

### Recuperación compatible

1. Localizar una copia externa del keystore original `~/.android/debug.keystore`, creado por el workflow histórico con store password `android` y alias `androiddebugkey`.
2. En GitHub → Settings → Secrets and variables → Actions, crear el secreto de repositorio `JBAE_ANDROID_SIGNING_KEYSTORE_BASE64` con el contenido Base64 del keystore original.
3. El workflow restaurará ese archivo si la caché falta, validará su alias/password, guardará una nueva caché y seguirá utilizando el mismo certificado.
4. Si no existe una copia del keystore original, detener la publicación de actualizaciones para la aplicación actual. El certificado público que contiene el APK no permite reconstruir la clave privada. No cambiar el Application ID ni generar otro certificado como supuesto reemplazo de una actualización compatible.

La Release `jbae-v0.4.83` sigue siendo el canal público existente. No representa el código de los bloques 1–8. El actualizador debe seguir descargando únicamente releases oficiales, y el siguiente release compatible queda bloqueado hasta recuperar la identidad de firma original.

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

Al disponer del APK release:

- [ ] Registrar marca/modelo del teléfono y versión Android.
- [ ] Instalar JBAE sin una copia anterior, abrir y esperar a que cargue la biblioteca.
- [ ] Abrir FRAGRANCE y buscar un perfume conocido del seed.
- [ ] Guardar una preferencia y valorar un perfume.
- [ ] Marcar un favorito, añadir a colección y guardar una nota privada.
- [ ] Forzar detención desde Ajustes → Aplicaciones → JBAE → Forzar detención.
- [ ] Reabrir JBAE y confirmar que los datos anteriores siguen presentes.
- [ ] Reiniciar el teléfono y repetir la comprobación.
- [ ] Desde una versión previa instalada, descargar la nueva actualización e instalar encima sin desinstalar.
- [ ] Confirmar que la pantalla de Android muestra JBAE y la versión esperada.
- [ ] Abrir de nuevo y comprobar que el perfil y la colección se conservaron.
- [ ] Probar una búsqueda FRAGRANCE en modo avión; anotar las funciones online TECH como no disponibles offline.

Registrar versión, `versionCode`, teléfono, versión Android, paso y resultado cuando algo falle.

## 8. Criterio de salida del Bloque 8

El pipeline de validación del código integrado está aprobado, pero la difusión de un APK actualizado permanece bloqueada por la recuperación de la firma original. Solo queda aprobada cuando el APK firmado pase CI y el asset publicado se valide byte por byte. La certificación final de producto Android se cierra solo cuando todos los puntos de la sección 6 se hayan ejecutado sin pérdida de datos ni error de instalación/actualización.

No se debe afirmar certificación física si el usuario todavía no ha ejecutado esas pruebas. No fusionar la cadena a `main` como atajo para fabricar un resultado de certificación.
