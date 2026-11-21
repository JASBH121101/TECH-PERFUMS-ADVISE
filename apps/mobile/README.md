# JBAE · Aplicación Android independiente

JBAE es una aplicación Android y una vista previa web independientes que consumen el motor de este repositorio. No es un módulo de JB Manager ni de JB Collections.

## Implementado

- Aplicación Capacitor con navegación principal entre Inicio, FRAGRANCE, TECH y Biblioteca.
- FRAGRANCE: búsqueda offline, fichas de perfumes y asesor personalizado en español. El perfil olfativo conserva familias/notas preferidas y evitadas, ocasión y clima; las valoraciones positivas/negativas contribuyen al aprendizaje tras repetirse en al menos dos fragancias distintas.
- Perfil local persistente en SQLite nativo, con preferencias, historial de hasta 500 valoraciones, favoritos y colección personal (por probar, en posesión y probado). Las referencias se validan contra el catálogo. También se puede comparar de 2 a 4 perfumes sin generar un ganador artificial. La colección permite filtrar por estado o favoritos, buscar por perfume/casa/familia y guardar, editar o borrar notas privadas de hasta 240 caracteres. Se pueden seleccionar de 2 a 4 perfumes desde favoritos o colección y abrir la comparación directamente. La vista previa web sigue siendo temporal.
- Biblioteca inicial construida desde el snapshot Scento del repositorio; la procedencia permanece como reportada y no equivale a verificación sensorial.
- TECH: consulta exacta por modelo a CoreInfo y TechAPI para smartphones, tablets, laptops, smartwatches y monitores. Incluye comparación visual de 2–4 equipos, normalización de unidades y variantes con IDs por configuración, detección de conflictos entre fuentes y perfil "Uso general (equilibrado)" con ponderación de varias dimensiones y desglose de cobertura, además de criterios individuales. Los resultados siguen siendo candidatos sin verificar y no se guardan automáticamente. Las consultas en curso se invalidan al cambiar de pantalla, modo o categoría para impedir que respuestas antiguas sobrescriban la selección actual; el comparador conserva los modelos seleccionados cuando una consulta falla.
- SQLite nativo mediante `@capacitor-community/sqlite`, con importación inicial del seed y uso de `CapacitorSQLiteKnowledgeAdapter`.
- Actualizador Android propio: GitHub Releases, DownloadManager en segundo plano, recuperación del estado de descarga y validación de paquete, versión, tamaño, estructura APK y continuidad del certificado.
- Vista previa pública en GitHub Pages con manifiesto PWA, iconos instalables y service worker para shell/recursos del mismo origen.

## Vista previa y APK publicada

- GitHub Pages: https://jasbh121101.github.io/TECH-PERFUMS-ADVISE/
- Repositorio: https://github.com/JASBH121101/TECH-PERFUMS-ADVISE
- Releases y versión más reciente: https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/releases/latest
- Descarga APK más reciente: https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/releases/latest/download/JBAE.apk
- Release inicial: [JBAE v0.4.0](https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/releases/tag/jbae-v0.4.0)
- Application ID: `com.jb.advisor.mobile`
- Versión inicial publicada: `0.4.0`, `versionCode=21`. Las siguientes versiones usan el contador monotónico del workflow Android.

La vista previa web usa memoria temporal: al recargar o cerrar el navegador se pierde el estado de la sesión. La instalación Android usa SQLite nativo.

## Instalación y distribución directa del APK

1. Descarga siempre el APK desde [JBAE Releases](https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/releases/latest/download/JBAE.apk).
2. Abre el archivo desde Descargas. Android mostrará el instalador del paquete.
3. En una primera instalación, Android puede pedir permiso para instalar aplicaciones desde el navegador o administrador de archivos que abrió el APK. En Ajustes, activa «Permitir desde esta fuente» únicamente para esa aplicación de origen y confirma la instalación en Android.
4. La transición a la nueva firma requiere una instalación limpia: Android no permite instalar el APK nuevo encima de una versión que conserva el certificado histórico. Antes de desinstalar la versión antigua, tené presente que Android elimina sus datos privados locales, incluida la base SQLite. No hay migración automática de esos datos implementada.
5. Una vez instalada la versión nueva, las siguientes actualizaciones podrán instalarse encima siempre que mantengan el mismo Application ID y el nuevo certificado.

La distribución es descarga directa desde GitHub Releases; no es una publicación en Google Play. El certificado histórico de la versión 0.4.83 se conserva como referencia, pero la nueva identidad será un keystore PKCS#12 dedicado a JBAE, no una clave de Play Store.

**Transición de firma (21-11-2026):** GitHub ya no conserva la caché de la clave histórica. Se autorizó reemplazarla. La última Release pública sigue siendo `jbae-v0.4.83`, firmada con el certificado anterior; todavía no se ha generado ni publicado un APK con la nueva identidad.

Para crear la nueva identidad en Windows, ejecutá `scripts/create-android-signing-key.ps1` desde PowerShell. El script crea `%USERPROFILE%\JBAE-signing-backup\jbae-release.p12`, alias `jbae-release-2026`, RSA 3072 y vigencia de 10,000 días. Después guarda estos secretos en GitHub → Settings → Secrets and variables → Actions:
- `JBAE_ANDROID_KEYSTORE_PASSWORD`
- `JBAE_ANDROID_SIGNING_KEYSTORE_BASE64`

El workflow valida el keystore PKCS#12, comprueba que la huella del APK coincida con la huella derivada de la clave protegida y utiliza los secretos en cada compilación. No depende de una caché de Actions. No compartas el archivo .p12, la cadena Base64 ni la contraseña por chat, issues o commits. Conservá una copia cifrada adicional del .p12 fuera del repositorio.

## Desarrollo local

Requisitos: Node.js 22.12 o posterior, Java 21 y Android SDK.

```bash
cd apps/mobile
npm install
npm run dev
```

Pruebas y compilación web:

```bash
npm test
npm run build
```

Compilación Android local:

```bash
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

## Versionado y actualizaciones

La versión base de la aplicación se mantiene en `apps/mobile/package.json`. El workflow Android deriva el número publicado como `MAJOR.MINOR.GITHUB_RUN_NUMBER`; por ejemplo, con la serie base `0.4.0` y el run 22, publica `0.4.22`. El mismo valor se usa en el bundle web, el `versionName`, el tag `jbae-v...` y el nombre del artefacto. `versionCode` sigue el número monotónico del workflow Android.

Cada Release usa el mismo `applicationId` y el keystore PKCS#12 `jbae-release.p12`, reconstruido desde secretos protegidos de GitHub Actions. La identidad nueva no debe regenerarse ni perderse: las futuras actualizaciones dependen de conservar exactamente ese archivo y contraseña. La firma nueva no es compatible con la app antigua ya instalada; la transición requiere desinstalar la versión anterior y aceptar la pérdida de sus datos locales. Después de esa instalación limpia, las versiones firmadas con el nuevo keystore podrán actualizarse normalmente. Android siempre solicita confirmación antes de instalar y no se admite instalación silenciosa.

## Pendiente / no certificado en dispositivo

- El perfil "Uso general" es un índice relativo de especificaciones comunes (RAM, almacenamiento, batería, resolución de cámara principal y peso); exige al menos tres dimensiones y 60% de cobertura. El procesador/GPU se muestra sin puntuar por nombre si no hay benchmarks comparables. Megapíxeles no equivalen a calidad fotográfica y mAh/Wh no equivalen directamente a horas de autonomía.
- La revisión humana sigue siendo necesaria para promover datos `reported` a `verified` o `cross_checked`; el botón de guardado no verifica la exactitud de los proveedores.
- Pruebas en emulador y teléfono físico: primera importación SQLite, cierre/reapertura, recuperación tras terminación del proceso y restauración de backup. Las pruebas automatizadas del perfil usan el adaptador SQLite simulado y no sustituyen esta certificación física.
- SQLCipher no está habilitado en esta fase.
- PWA: shell, manifiesto, iconos y precarga offline de HTML, JS/CSS y recursos estáticos implementados para Pages. La vista previa web todavía usa memoria temporal y no conserva el estado de conocimiento después de recargar; eso es independiente de la caché del service worker.
- Ampliar cobertura de FRAGRANCE a body mists, body sprays, aceites y lociones antes de afirmar que el dataset los cubre ampliamente.

Los workflows verifican pruebas automatizadas, compilación Android, identidad del paquete, versión, firma y que el APK publicado coincida byte por byte con el artefacto compilado. Eso no reemplaza la validación final en un teléfono real del instalador, SQLite nativo, el actualizador y la conservación de datos después de una actualización.
