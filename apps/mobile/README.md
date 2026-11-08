# JBAE · Aplicación Android independiente

Esta carpeta contiene la aplicación móvil independiente que consume el motor del repositorio. No es un módulo de JB Manager ni de JB Collections.

## Estado de esta entrega

- Shell móvil Vite preparado para Capacitor 8.
- Áreas separadas de inicio, FRAGRANCE, TECH y biblioteca.
- FRAGRANCE carga el catálogo local Scento desde el dataset versionado del repositorio.
- En Android, el conocimiento se persiste mediante el adaptador SQLite del motor y `@capacitor-community/sqlite`.
- En navegador se usa memoria temporal solo para previsualización; no representa persistencia duradera.
- TECH está conectado al esquema y al almacén local del motor, pero todavía no incluye catálogo tecnológico inicial ni una pantalla terminada de investigación/comparación.
- JBAE es un rótulo de desarrollo provisional. El identificador técnico de Android es `com.jb.advisor.mobile`; el nombre comercial se podrá cambiar sin renombrar el motor ni los módulos.

## Requisitos

- Node.js 22.12 o posterior.
- Android Studio y Android SDK para generar el APK local.
- Java 21 recomendado para la compilación Android de esta rama.

## Vista previa

```bash
cd apps/mobile
npm install
npm run dev
```

La vista previa web utiliza memoria temporal. Recargar o cerrar el navegador elimina el estado de esa sesión.

## Generar APK Android

La primera vez:

```bash
cd apps/mobile
npm install
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

APK debug: `android/app/build/outputs/apk/debug/app-debug.apk`.

El workflow `JBAE Android App` repite los pasos en un runner limpio y publica el APK como artefacto de GitHub Actions.

## Persistencia y protección de datos

La base SQLite local se configura sin cifrado SQLCipher en esta etapa. La documentación del plugin indica que su implementación nativa incluye SQLCipher incluso cuando la base no se cifra; antes de distribuir una versión comercial se debe revisar el requisito aplicable de declaración/self-classification de exportación de cifrado.

No se transmiten perfiles personales ni se conectan servicios de pago en esta fase. No hay sincronización cloud ni cuenta de usuario.

## Límites conocidos

- El catálogo de fragancias procede de un snapshot fechado y su licencia se atribuye dentro de la interfaz.
- La presencia de notas/familias en la fuente no demuestra rendimiento, duración, proyección o autenticidad.
- TECH no inventa productos ni comparativas mientras no haya fichas técnicas cargadas.
- El workflow genera un APK debug para validación. Todavía no existe APK release firmado ni validación en dispositivo físico.
