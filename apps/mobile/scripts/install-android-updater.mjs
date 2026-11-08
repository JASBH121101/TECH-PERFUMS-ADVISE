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

const mainPath = await findMainActivity(resolve(root, "android/app/src/main/java"));
if (!mainPath) throw new Error("Capacitor MainActivity.java was not generated.");
const packageDirectory = dirname(mainPath);
await mkdir(packageDirectory, { recursive: true });
await copyFile(join(root, "native-android/ApkUpdaterPlugin.java"), join(packageDirectory, "ApkUpdaterPlugin.java"));

let mainSource = await readFile(mainPath, "utf8");
if (!mainSource.includes("registerPlugin(ApkUpdaterPlugin.class)")) {
  const registerCall = "registerPlugin(ApkUpdaterPlugin.class);";
  const superCall = "super.onCreate(savedInstanceState);";
  if (mainSource.includes(superCall)) {
    mainSource = mainSource.replace(superCall, registerCall + "\n        " + superCall);
  } else {
    if (!mainSource.includes("import android.os.Bundle;")) {
      mainSource = mainSource.replace(/package [^;]+;/u, match => match + "\n\nimport android.os.Bundle;");
    }
    const classMatch = /public\s+class\s+MainActivity\s+extends\s+BridgeActivity\s*\{/u.exec(mainSource);
    if (!classMatch) throw new Error("Could not locate the generated BridgeActivity class.");
    const insertAt = classMatch.index + classMatch[0].length;
    mainSource = mainSource.slice(0, insertAt) +
      "\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n" +
      "        " + registerCall + "\n        super.onCreate(savedInstanceState);\n    }\n" +
      mainSource.slice(insertAt);
  }
  await writeFile(mainPath, mainSource, "utf8");
}

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
console.log("Registered JBAE APK updater, install permission and ProGuard keep rules.");
