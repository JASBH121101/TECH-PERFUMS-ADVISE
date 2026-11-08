import { apkUpdater } from "./apk-updater.js";
import { apkUpdater } from "./apk-updater.js";
import { compareVersions, fetchLatestJbaeRelease } from "./update-utils.js";

const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION || "0.4.0";
let latestRelease = null;
let noticeElement = null;
let monitorTimer = null;
let monitorBusy = false;
let installPermissionPending = false;
let lastInstallAttempt = "";

function closeNotice() {
  noticeElement?.remove();
  noticeElement = null;
}

function showNotice({ title, message, actionLabel = "", onAction = null, dismissible = true } = {}) {
  closeNotice();
  const notice = document.createElement("aside");
  notice.className = "update-notice";
  notice.id = "jbae-update-notice";
  notice.setAttribute("role", "status");
  const copy = document.createElement("div");
  copy.className = "update-notice-copy";
  const heading = document.createElement("strong");
  heading.textContent = title;
  const description = document.createElement("p");
  description.textContent = message;
  copy.append(heading, description);
  notice.append(copy);
  const actions = document.createElement("div");
  actions.className = "update-notice-actions";
  if (actionLabel && typeof onAction === "function") {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "update-notice-primary";
    action.textContent = actionLabel;
    action.addEventListener("click", async () => {
      action.disabled = true;
      try {
        await onAction();
      } catch (error) {
        showNotice({
          title: "No se pudo continuar",
          message: error instanceof Error ? error.message : "Ocurrió un error con la actualización.",
        });
      } finally {
        action.disabled = false;
      }
    });
    actions.append(action);
  }
  if (dismissible) {
    const close = document.createElement("button");
    close.type = "button";
    close.className = "update-notice-close";
    close.textContent = "Cerrar";
    close.addEventListener("click", closeNotice);
    actions.append(close);
  }
  notice.append(actions);
  document.body.append(notice);
  noticeElement = notice;
}

function stopMonitor() {
  if (monitorTimer !== null) window.clearInterval(monitorTimer);
  monitorTimer = null;
  monitorBusy = false;
}

async function openInstaller(release) {
  const result = await apkUpdater.installDownloadedApk();
  if (result?.permissionRequired) {
    installPermissionPending = true;
    showNotice({
      title: "Permiso de instalación necesario",
      message: "Android abrió los ajustes de esta aplicación. Activá «Permitir desde esta fuente» y regresá aquí para continuar. El APK ya está descargado y validado.",
      actionLabel: "Ya activé el permiso",
      onAction: async () => {
        installPermissionPending = false;
        await openInstaller(release);
      },
    });
    return;
  }
  if (result?.installerLaunched) {
    installPermissionPending = false;
    closeNotice();
    return;
  }
  showNotice({
    title: "APK descargada",
    message: "La descarga terminó, pero Android no abrió el instalador. Podés volver a intentarlo.",
    actionLabel: "Abrir instalador",
    onAction: () => openInstaller(release),
  });
}

async function beginDownload(release) {
  if (!apkUpdater.isNative) {
    window.open(release.downloadUrl, "_blank", "noopener,noreferrer");
    return;
  }
  installPermissionPending = false;
  lastInstallAttempt = "";
  const result = await apkUpdater.downloadAndInstall({
    url: release.downloadUrl,
    version: release.version,
  });
  if (result?.permissionRequired) {
    await openInstaller(release);
  } else if (result?.installerLaunched) {
    closeNotice();
  } else {
    showNotice({
      title: "Descarga de JBAE iniciada",
      message: "Android descargará el APK en segundo plano y mostrará una notificación al terminar. Podés seguir usando el teléfono.",
    });
    startMonitor(release);
  }
}

async function pollDownload(release) {
  if (monitorBusy || !apkUpdater.isNative) return;
  monitorBusy = true;
  try {
    const status = await apkUpdater.getDownloadStatus();
    if (!status || ["idle", "unsupported"].includes(status.status)) {
      stopMonitor();
      return;
    }
    if (["pending", "running", "paused"].includes(status.status)) {
      const total = Number(status.totalBytes) || 0;
      const downloaded = Number(status.bytesDownloaded) || 0;
      const amount = total > 0
        ? Math.min(100, Math.floor(downloaded * 100 / total)) + "% · " +
          (downloaded / 1048576).toFixed(1) + " / " + (total / 1048576).toFixed(1) + " MB"
        : "Calculando el tamaño de la descarga";
      showNotice({
        title: "Descargando JBAE v" + (status.version || release.version),
        message: amount + (status.status === "paused"
          ? ". Android pausó temporalmente la transferencia y la reanudará cuando sea posible."
          : ". Podés salir de JBAE; Android continuará la descarga en segundo plano."),
      });
      return;
    }
    if (status.status === "successful") {
      stopMonitor();
      if (status.installPrompted || installPermissionPending) return;
      const attemptKey = String(status.downloadId || "") + ":" + String(status.version || "");
      if (lastInstallAttempt === attemptKey) return;
      lastInstallAttempt = attemptKey;
      await openInstaller(release);
      return;
    }
    if (status.status === "failed") {
      stopMonitor();
      showNotice({
        title: "La descarga no se completó",
        message: status.error || "Android informó un error. Revisá la conexión y el espacio disponible.",
        actionLabel: "Reintentar descarga",
        onAction: () => beginDownload(release),
      });
      return;
    }
    if (status.status === "unknown") {
      stopMonitor();
      showNotice({
        title: "No se pudo recuperar la descarga",
        message: "Android ya no encuentra la transferencia anterior. Podés iniciar una descarga nueva.",
        actionLabel: "Descargar de nuevo",
        onAction: () => beginDownload(release),
      });
    }
  } catch (error) {
    showNotice({
      title: "Comprobando la descarga",
      message: error instanceof Error ? error.message : "Android todavía no devolvió el estado de la descarga.",
    });
  } finally {
    monitorBusy = false;
  }
}

function startMonitor(release) {
  stopMonitor();
  void pollDownload(release);
  monitorTimer = window.setInterval(() => void pollDownload(release), 1500);
}

async function checkForUpdates(interactive = false) {
  const button = document.getElementById("update-button");
  if (button) {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
  }
  try {
    latestRelease = await fetchLatestJbaeRelease();
    if (!latestRelease) {
      if (interactive) showNotice({
        title: "No hay una versión publicada",
        message: "Todavía no se encontró un APK oficial de JBAE en GitHub Releases.",
      });
      return;
    }
    if (!apkUpdater.isNative) {
      if (interactive) showNotice({
        title: "JBAE v" + latestRelease.version + " está publicada",
        message: "Esta es la vista web de Pages. Para instalar o actualizar Android, descargá el APK oficial.",
        actionLabel: "Descargar APK",
        onAction: () => beginDownload(latestRelease),
      });
      return;
    }
    if (compareVersions(latestRelease.version, CURRENT_VERSION) > 0) {
      showNotice({
        title: "Actualización disponible · v" + latestRelease.version,
        message: "Hay una nueva versión firmada de JBAE. Android descargará el APK en segundo plano y abrirá su instalador cuando termine.",
        actionLabel: "Descargar e instalar",
        onAction: () => beginDownload(latestRelease),
      });
    } else if (interactive) {
      showNotice({
        title: "JBAE está actualizada",
        message: "Versión instalada: v" + CURRENT_VERSION + ". Última versión publicada: v" + latestRelease.version + ".",
      });
    }
  } catch (error) {
    if (interactive) showNotice({
      title: "No se pudo comprobar la actualización",
      message: error instanceof Error ? error.message : "Revisá la conexión e intentá de nuevo.",
    });
  } finally {
    if (button) {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  }
}

function startMonitor(release) {
  stopMonitor();
  void pollDownload(release);
  monitorTimer = window.setInterval(() => void pollDownload(release), 1500);
}

async function restorePendingDownload() {
  if (!apkUpdater.isNative || !latestRelease) return;
  try {
    const status = await apkUpdater.getDownloadStatus();
    if (!status) return;
    if (["pending", "running", "paused", "successful"].includes(status.status)) {
      const release = status.version === latestRelease.version
        ? latestRelease
        : { ...latestRelease, version: status.version };
      if (status.status === "successful" && status.installPrompted) return;
      startMonitor(release);
    } else if (status.status === "failed") {
      showNotice({
        title: "La descarga anterior falló",
        message: status.error || "Podés volver a intentar la actualización.",
        actionLabel: "Reintentar",
        onAction: () => beginDownload(latestRelease),
      });
    }
  } catch (error) {
    console.info("No se pudo recuperar el estado del actualizador nativo.", error);
  }
}

export function initializeUpdateManager() {
  const button = document.getElementById("update-button");
  if (!button) return;
  button.addEventListener("click", () => void checkForUpdates(true));
  button.title = apkUpdater.isNative ? "Buscar actualizaciones de JBAE" : "Descargar APK de JBAE";
  button.setAttribute("aria-label", button.title);
  void checkForUpdates(false).then(() => restorePendingDownload());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void checkForUpdates(false).then(() => {
        if (!installPermissionPending) void restorePendingDownload();
      });
    }
  });
}
