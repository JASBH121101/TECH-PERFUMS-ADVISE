# JBAE · Aplicación Android independiente

JBAE es una aplicación Android y una vista previa web independientes que consumen el motor de este repositorio. No es un módulo de JB Manager ni de JB Collections.

## Implementado

- Aplicación Capacitor con navegación principal entre Inicio, FRAGRANCE, TECH y Biblioteca.
- FRAGRANCE: búsqueda offline, fichas de perfumes y asesor personalizado en español.
- Biblioteca inicial construida desde el snapshot Scento del repositorio; la procedencia permanece como reportada y no equivale a verificación sensorial.
- TECH: consulta exacta por modelo a CoreInfo y TechAPI para smartphones, tablets, laptops, smartwatches y monitores. Los resultados se muestran como candidatos sujetos a revisión; no se guardan automáticamente.
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

Cada Release usa el mismo `applicationId` y una identidad de firma JBAE persistente almacenada en la caché protegida de GitHub Actions. La clave establecida no debe regenerarse, eliminarse ni rotarse: una firma distinta impediría actualizar la aplicación instalada. Esta identidad procede de un keystore de tipo debug persistente; no es una clave de publicación de Google Play. Android siempre solicita confirmación antes de instalar y no se admite instalación silenciosa.

El workflow falla de forma cerrada si ya existe el marcador de identidad y la caché de firma no está disponible. No se debe eliminar ese control para forzar una compilación.

## Pendiente / no certificado en dispositivo

- Comparador visual TECH para 2–4 equipos.
- Normalización de variantes de hardware, cotejo de datos entre fuentes y guardado local solo después de aprobación explícita.
- Pruebas en emulador y teléfono físico: primera importación SQLite, cierre/reapertura, recuperación tras terminación del proceso y restauración de backup.
- SQLCipher no está habilitado en esta fase.
- PWA: shell, manifiesto, iconos y caché offline de recursos estáticos implementados para Pages. La vista previa web todavía usa memoria temporal y no conserva el estado de conocimiento después de recargar; eso es independiente de la caché del service worker.
- Ampliar cobertura de FRAGRANCE a body mists, body sprays, aceites y lociones antes de afirmar que el dataset los cubre ampliamente.

Los workflows actuales verifican pruebas automatizadas, compilación Android, identidad del paquete, versión, firma y publicación del APK. No certifican instalación real, comportamiento del actualizador ni persistencia después de reiniciar Android.
