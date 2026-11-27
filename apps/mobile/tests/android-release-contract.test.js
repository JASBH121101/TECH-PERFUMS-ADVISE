import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFile(join(root, path), "utf8");

test("Capacitor package identity and local SQLite policy remain stable", async () => {
  const config = JSON.parse(await read("capacitor.config.json"));
  const pkg = JSON.parse(await read("package.json"));
  assert.equal(config.appId, "com.jb.advisor.mobile");
  assert.equal(config.appName, "JBAE");
  assert.equal(config.plugins.CapacitorSQLite.androidIsEncryption, false);
  assert.equal(pkg.dependencies["@capacitor-community/sqlite"], "8.1.1");
  assert.equal(pkg.dependencies["@capacitor/android"], "8.6.0");
});

test("release version follows the existing monotonic major.minor.run-number scheme", async () => {
  const source = await read("src/version.js");
  const workflow = await read("../../.github/workflows/android-app.yml");
  assert.match(source, /return String\(Number\(match\[1\]\)\) \+ "\." \+ String\(Number\(match\[2\]\)\) \+ "\." \+ numericRun/u);
  assert.match(workflow, /VERSION_CODE: \$\{\{ github\.run_number \}\}/u);
  assert.match(workflow, /resolve-release-version\.mjs/u);
  assert.ok(workflow.includes('os.environ["VERSION_CODE"]'));
});

test("JavaScript updater only accepts the official versioned JBAE release asset", async () => {
  const updater = await read("src/apk-updater.js");
  const utils = await read("src/update-utils.js");
  assert.match(updater, /Capacitor\.getPlatform\(\) === "android"/u);
  assert.match(updater, /RELEASE_PREFIX = "https:\/\/github\.com\/JASBH121101\/TECH-PERFUMS-ADVISE\/releases\/download\//u);
  assert.match(updater, /const expectedUrl = RELEASE_PREFIX \+ "jbae-v" \+ normalizedVersion \+ "\/JBAE\.apk"/u);
  assert.match(updater, /url !== expectedUrl/u);
  assert.match(utils, /jbae-v/u);
  assert.match(utils, /release\.tag_name/u);
  assert.match(utils, /item\?\.name === "JBAE\.apk"/u);
  assert.match(utils, /release\.draft \|\| release\.prerelease/u);
});

test("native APK updater validates official HTTPS path, package, version, size and signing identity", async () => {
  const plugin = await read("native-android/ApkUpdaterPlugin.java");
  assert.match(plugin, /EXPECTED_PACKAGE = "com\.jb\.advisor\.mobile"/u);
  assert.match(plugin, /"https"\.equalsIgnoreCase\(parsed\.getScheme\(\)\)/u);
  assert.match(plugin, /"github\.com"\.equalsIgnoreCase\(parsed\.getHost\(\)\)/u);
  assert.match(plugin, /parsed\.getQuery\(\) == null/u);
  assert.match(plugin, /archive\.packageName/u);
  assert.match(plugin, /expectedVersion\.equals\(archive\.versionName\)/u);
  assert.match(plugin, /file\.length\(\) != expectedBytes/u);
  assert.match(plugin, /MessageDigest\.getInstance\("SHA-256"\)/u);
  assert.match(plugin, /sameHashSet\(installedHashes, archiveHashes\)/u);
  assert.match(plugin, /PackageManager\.GET_SIGNING_CERTIFICATES/u);
});

test("native installer is user-confirmed and requests Android unknown-source permission", async () => {
  const plugin = await read("native-android/ApkUpdaterPlugin.java");
  const installScript = await read("scripts/install-android-updater.mjs");
  assert.match(installScript, /REQUEST_INSTALL_PACKAGES/u);
  assert.match(plugin, /Settings\.ACTION_MANAGE_UNKNOWN_APP_SOURCES/u);
  assert.match(plugin, /Intent\.ACTION_VIEW/u);
  assert.match(plugin, /getActivity\(\)\.startActivity\(intent\)/u);
  assert.doesNotMatch(plugin, /PackageInstaller\.SessionParams\.MODE_FULL_INSTALL/u);
  assert.doesNotMatch(plugin, /installExistingPackage/u);
});

test("native registration and shrinker rules are installed by the Android build script", async () => {
  const script = await read("scripts/install-android-updater.mjs");
  assert.match(script, /registerPlugin\(ApkUpdaterPlugin\.class\)/u);
  assert.match(script, /ApkUpdaterPlugin\.java/u);
  assert.match(script, /-keep class com\.jb\.advisor\.mobile\.ApkUpdaterPlugin/u);
  assert.match(script, /configureJbaeSystemBars\(\)/u);
});

test("release workflow tests before signing, verifies package and signature, then publishes", async () => {
  const workflow = await read("../../.github/workflows/android-app.yml");
  const mobileTests = workflow.indexOf("run: npm test");
  const engineTests = workflow.indexOf("run: npm test", mobileTests + 1);
  const assemble = workflow.indexOf("name: Assemble signed release APK");
  const verify = workflow.indexOf("name: Verify APK signature, certificate fingerprint and package");
  const publish = workflow.indexOf("Publish installable APK release");
  const verifyAsset = workflow.indexOf("Verify published APK asset");
  assert.ok(mobileTests >= 0 && engineTests > mobileTests);
  assert.ok(assemble > engineTests);
  assert.ok(verify > assemble);
  assert.ok(publish > verify);
  assert.match(workflow, /apksigner" verify/u);
  assert.match(workflow, /aapt" dump badging/u);
  assert.ok(verifyAsset > publish);
  assert.match(workflow, /JBAE_ANDROID_SIGNING_KEYSTORE_BASE64/u);
  assert.match(workflow, /JBAE_ANDROID_KEYSTORE_PASSWORD/u);
  assert.match(workflow, /JBAE_SIGNING_CERT_SHA256/u);
  assert.match(workflow, /jbae-release-2026/u);
  assert.equal(workflow.includes("actions/cache/restore@v4"), false);
  assert.equal(workflow.includes("actions/cache/save@v4"), false);
  assert.equal(workflow.includes("debug.keystore"), false);
  assert.match(workflow, /cmp JBAE\.apk/u);
  assert.match(workflow, /actions\/upload-artifact@v4/u);
});

test("release channel and direct APK distribution are documented without claiming Play Store publication", async () => {
  const readme = await read("README.md");
  assert.match(readme, /releases\/latest\/download\/JBAE\.apk/u);
  assert.match(readme, /jbae-release\.p12/u);
  assert.match(readme, /no es una publicación en Google Play/u);
  assert.match(readme, /Permitir desde esta fuente/u);
});

test("new signing identity is restored from protected PKCS12 secrets and fingerprint-pinned at build time", async () => {
  const workflow = await read("../../.github/workflows/android-app.yml");
  assert.ok(workflow.includes("JBAE_ANDROID_SIGNING_KEYSTORE_BASE64"));
  assert.ok(workflow.includes("JBAE_ANDROID_KEYSTORE_PASSWORD"));
  assert.ok(workflow.includes("keytool -list -storetype PKCS12"));
  assert.ok(workflow.includes('keyAlias "jbae-release-2026"'));
  assert.ok(workflow.includes("JBAE_SIGNING_CERT_SHA256"));
  assert.ok(workflow.includes("The APK certificate fingerprint does not match"));
  assert.equal(workflow.includes("actions/cache/restore@v4"), false);
  assert.equal(workflow.includes("actions/cache/save@v4"), false);
  assert.match(workflow, /storeType "PKCS12"/u);
  assert.match(workflow, /JBAE_SIGNING_CERT_SHA256/u);
});

test("manual APK release dispatch builds from the integrated certification branch", async () => {
  const workflow = await read("../../.github/workflows/android-app.yml");
  assert.match(workflow, /workflow_dispatch:/u);
  assert.ok(workflow.includes("ref: ${{ github.event_name == 'workflow_dispatch' && 'feature/jbae-android-certification' || github.sha }}"));
  assert.doesNotMatch(workflow, /pull_request:/u);
  assert.match(workflow, /name: Publish installable APK release/u);
  assert.match(workflow, /name: Verify published APK asset/u);
});


test("Android readability stylesheet is bundled by Vite and raises app-wide mobile text sizes", async () => {
  const entry = await read("src/main.js");
  const html = await read("index.html");
  const accessibility = await read("src/update-accessibility.css");
  assert.match(entry, /import "\.\/update-accessibility\.css";/u);
  assert.doesNotMatch(html, /href=["']\/src\/update-accessibility\.css/u);
  assert.match(accessibility, /#app p \{\s*font-size: 14px/su);
  assert.match(accessibility, /#app small \{\s*font-size: 12px/su);
  assert.match(accessibility, /#jbae-update-notice \.update-notice-copy p \{\s*font-size: 15px/su);
});




test("editable text fields render blank and do not show example text inside controls", async () => {
  const source = await read("src/main.js");
  assert.equal(source.includes("placeholder="), false);
  assert.ok(source.includes('searchQuery: ""'));
  assert.ok(source.includes('fragrancePrompt: ""'));
  assert.ok(source.includes('collectionSearch: ""'));
  assert.ok(source.includes('comparisonSearch: ""'));
  assert.ok(source.includes('techModel: ""'));
  assert.ok(source.includes('techCompareModels: ["", "", "", ""]'));
  assert.ok(source.includes('<textarea id="collection-note-editor" name="note" maxlength="240" rows="3"></textarea>'));
  assert.ok(source.includes('data-action="delete-collection-note"'));
});


test("readability contract overrides compact legacy typography in the shipped interface", async () => {
  const accessibility = await read("src/update-accessibility.css");
  assert.ok(accessibility.includes("#app p {"));
  assert.ok(accessibility.includes("font-size: 15px !important;"));
  assert.ok(accessibility.includes("font-size: 13px !important;"));
  assert.ok(accessibility.includes("font-size: 16px !important;"));
  assert.ok(accessibility.includes("font-size: 14px !important;"));
});

test("fragrance customer requests are ephemeral and old preference filters are cleared on boot", async () => {
  const source = await read("src/main.js");
  assert.match(source, /function clearFragranceRequest\(\)/u);
  assert.match(source, /preferredFamilies: \[\]/u);
  assert.match(source, /avoidFamilies: \[\]/u);
  assert.match(source, /Los filtros se usan solo para esta búsqueda/u);
  assert.doesNotMatch(source, /state\.fragranceForm = \{\s*occasion: state\.profile\.occasion/u);
  assert.match(source, /data-action="clear-fragrance-request"/u);
  assert.match(source, /data-action="fragrance-example"/u);
  assert.match(source, /Buscar esencias para el cliente/u);
  const submit = source.slice(source.indexOf('if (event.target.id === "fragrance-advisor-form")'), source.indexOf('if (event.target.id === "tech-compare-form")'));
  assert.doesNotMatch(submit, /saveFragranceProfile/u);
});
