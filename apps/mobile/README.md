# JBAE · Aplicación Android independiente

Esta aplicación móvil independiente consume el motor del repositorio. No es un módulo de JB Manager ni de JB Collections.

## Funciones de esta revisión

- Inicio simplificado: el menú inferior es la única navegación principal; se eliminó la cuadrícula repetida de accesos.
- Diseño edge-to-edge con insets del sistema para separar el encabezado del reloj, Wi-Fi, batería y barra de navegación de Android.
- FRAGRANCE: búsqueda directa en la biblioteca offline y asesor personalizado en una pantalla separada.
- El asesor interpreta frases en español y combina ocasión, familia, notas, carácter, clima e intensidad cuando la ficha tiene esos campos.
- Las restricciones no verificables no se tratan como satisfechas. No se inventa duración ni proyección; las coincidencias del dataset se identifican como no verificadas independientemente.
- TECH: consulta exacta por modelo/categoría a CoreInfo y TechAPI. Los resultados son candidatos de fuente, quedan sin guardar y requieren revisión.
- SQLite en Android conserva la biblioteca y el estado de conocimiento local.

## Requisitos

- Node.js 22.12 o posterior.
- Android Studio y Android SDK.
- Java 21 recomendado para Gradle.

## Vista previa

\`\`\`bash
cd apps/mobile
npm install
npm run dev
\`\`\`

La vista previa web utiliza memoria temporal. Recargar o cerrar el navegador elimina el estado de esa sesión.

## Generar APK Android

\`\`\`bash
cd apps/mobile
npm install
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
\`\`\`

APK debug: \`android/app/build/outputs/apk/debug/app-debug.apk\`.

El workflow \`JBAE Android App\` repite los pasos en un runner limpio y publica el APK como artefacto.

## Límites actuales

- La asesoría de FRAGRANCE utiliza el catálogo local y atributos reportados; no equivale a validación sensorial ni garantiza rendimiento.
- Los proveedores TECH consultan slugs exactos. No descargan el catálogo completo, y un modelo sin registro exacto puede no aparecer.
- Los resultados TECH siguen sin verificar. Comparación de 2–4 dispositivos, normalización de variantes, persistencia con aprobación y cotejo entre fuentes siguen pendientes.
- Todavía no hay prueba en dispositivo físico ni APK Release firmado.
- La base SQLite local está configurada sin cifrado SQLCipher en esta fase.
