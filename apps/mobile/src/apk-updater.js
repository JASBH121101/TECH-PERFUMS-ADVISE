import { Capacitor, registerPlugin } from "@capacitor/core";

const NativeApkUpdater = registerPlugin("ApkUpdater");
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/u;
const RELEASE_PREFIX = "https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/releases/download/";

export const apkUpdater = Object.freeze({
  isNative: Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android",
  downloadAndInstall({ url, version } = {}) {
    if (!(Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android")) {
      return Promise.reject(new Error("La descarga e instalación nativas solo están disponibles en Android."));
    }
    const normalizedVersion = String(version ?? "");
    const expectedUrl = RELEASE_PREFIX + "jbae-v" + normalizedVersion + "/JBAE.apk";
    if (!VERSION_PATTERN.test(normalizedVersion) || url !== expectedUrl) {
      return Promise.reject(new Error("El enlace no pertenece a una publicación oficial de JBAE."));
    }
    return NativeApkUpdater.downloadAndInstall({ url: expectedUrl, version: normalizedVersion });
  },
  getDownloadStatus() {
    return this.isNative ? NativeApkUpdater.getDownloadStatus() : Promise.resolve({ status: "unsupported" });
  },
  installDownloadedApk() {
    if (!this.isNative) return Promise.reject(new Error("La instalación nativa solo está disponible en Android."));
    return NativeApkUpdater.installDownloadedApk();
  }
});
