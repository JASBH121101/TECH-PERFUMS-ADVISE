import { copyFile, mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const root = process.cwd();
const config = JSON.parse(await readFile(join(root, "capacitor.config.json"), "utf8"));
if (config.appId !== "com.jb.advisor.mobile") throw new Error("Unexpected JBAE applicationId: " + config.appId);

async function findMainActivity(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      const found = await findMainActivity(path);
      if (found) return found;
    } else if (entry.isFile() && entry.name === "MainActivity.java") return path;
  }
  return null;
}

function ensureImport(source, importLine) {
  if (source.includes(importLine)) return source;
  return source.replace(/(package\s+[^;]+;)/u, "$1\n\n" + importLine);
}

function configureMainActivity(source) {
  const imports = [
    "import android.graphics.Color;",
    "import android.os.Bundle;",
    "import android.view.View;",
    "import android.view.Window;",
    "import androidx.core.graphics.Insets;",
    "import androidx.core.view.ViewCompat;",
    "import androidx.core.view.WindowCompat;",
    "import androidx.core.view.WindowInsetsCompat;",
  ];
  for (const line of imports) source = ensureImport(source, line);

  const classMatch = /public\s+class\s+MainActivity\s+extends\s+BridgeActivity\s*\{/u.exec(source);
  if (!classMatch) throw new Error("Could not locate the generated BridgeActivity class.");

  const registerCall = "registerPlugin(ApkUpdaterPlugin.class);";
  const superCall = "super.onCreate(savedInstanceState);";
  if (!source.includes("public void onCreate(Bundle savedInstanceState)")) {
    const insertAt = classMatch.index + classMatch[0].length;
    source = source.slice(0, insertAt) +
      "\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n" +
      "        " + registerCall + "\n        " + superCall +
      "\n        configureJbaeSystemBars();\n    }\n" +
      source.slice(insertAt);
  } else {
    if (!source.includes(registerCall)) {
      if (!source.includes(superCall)) throw new Error("MainActivity onCreate does not call super.onCreate.");
      source = source.replace(superCall, registerCall + "\n        " + superCall);
    }
    if (!source.includes("configureJbaeSystemBars();")) {
      if (!source.includes(superCall)) throw new Error("MainActivity onCreate does not call super.onCreate.");
      source = source.replace(superCall, superCall + "\n        configureJbaeSystemBars();");
    }
  }

  if (!source.includes("private void configureJbaeSystemBars()")) {
    const method = [
      "    private void configureJbaeSystemBars() {",
      "        Window window = getWindow();",
      "        WindowCompat.setDecorFitsSystemWindows(window, false);",
      "        window.setStatusBarColor(Color.TRANSPARENT);",
      "        window.setNavigationBarColor(Color.TRANSPARENT);",
      "",
      "        View content = findViewById(android.R.id.content);",
      "        if (content == null) {",
      "            throw new IllegalStateException(\"JBAE content root is unavailable for window insets.\");",
      "        }",
      "",
      "        final int initialLeft = content.getPaddingLeft();",
      "        final int initialTop = content.getPaddingTop();",
      "        final int initialRight = content.getPaddingRight();",
      "        final int initialBottom = content.getPaddingBottom();",
      "        final int systemBarsAndCutout =",
      "            WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout();",
      "",
      "        ViewCompat.setOnApplyWindowInsetsListener(content, (view, insets) -> {",
      "            Insets bars = insets.getInsets(systemBarsAndCutout);",
      "            view.setPadding(",
      "                initialLeft + bars.left,",
      "                initialTop + bars.top,",
      "                initialRight + bars.right,",
      "                initialBottom + bars.bottom",
      "            );",
      "",
      "            // Consume only system bars/cutout; preserve IME insets for the WebView.",
      "            return new WindowInsetsCompat.Builder(insets)",
      "                .setInsets(systemBarsAndCutout, Insets.NONE)",
      "                .setInsetsIgnoringVisibility(systemBarsAndCutout, Insets.NONE)",
      "                .build();",
      "        });",
      "        ViewCompat.requestApplyInsets(content);",
      "    }",
    ].join("\n");
    const finalBrace = source.lastIndexOf("}");
    if (finalBrace < 0) throw new Error("MainActivity closing brace was not found.");
    source = source.slice(0, finalBrace) + method + "\n" + source.slice(finalBrace);
  }

  if (!source.includes("WindowCompat.setDecorFitsSystemWindows(window, false)") ||
      !source.includes("ViewCompat.setOnApplyWindowInsetsListener(content") ||
      !source.includes("ViewCompat.requestApplyInsets(content)")) {
    throw new Error("JBAE native status/navigation bar inset handler was not installed.");
  }
  return source;
}

const mainPath = await findMainActivity(resolve(root, "android/app/src/main/java"));
if (!mainPath) throw new Error("Capacitor MainActivity.java was not generated.");
const packageDirectory = dirname(mainPath);
await mkdir(packageDirectory, { recursive: true });
await copyFile(join(root, "native-android/ApkUpdaterPlugin.java"), join(packageDirectory, "ApkUpdaterPlugin.java"));

const existingMainSource = await readFile(mainPath, "utf8");
const mainSource = configureMainActivity(existingMainSource);
await writeFile(mainPath, mainSource, "utf8");

const manifestPath = join(root, "android/app/src/main/AndroidManifest.xml");
let manifest = await readFile(manifestPath, "utf8");
const permission = '<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />';
if (!manifest.includes(permission)) {
  manifest = manifest.replace("<application", permission + "\n    <application");
  await writeFile(manifestPath, manifest, "utf8");
}

const rulesPath = join(root, "android/app/proguard-rules.pro");
let rules = "";
try { rules = await readFile(rulesPath, "utf8"); } catch {}
const requiredRules = [
  "-keepattributes *Annotation*",
  "-keep class * extends com.getcapacitor.Plugin { *; }",
  "-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }",
  "-keep class com.jb.advisor.mobile.ApkUpdaterPlugin { *; }",
];
for (const rule of requiredRules) if (!rules.includes(rule)) rules += rule + "\n";
await writeFile(rulesPath, rules, "utf8");
console.log("Registered JBAE APK updater and applied native Android system-bar insets to the WebView content root.");
