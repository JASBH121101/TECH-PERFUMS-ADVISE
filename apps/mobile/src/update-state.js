import { compareVersions } from "./update-utils.js";

export function resolveUpdateState(latestRelease, currentVersion, isNative) {
  if (!latestRelease || typeof latestRelease.version !== "string") {
    return Object.freeze({ status: "none", version: "" });
  }
  if (!isNative) {
    return Object.freeze({ status: "web", version: latestRelease.version });
  }
  const available = compareVersions(latestRelease.version, currentVersion) > 0;
  return Object.freeze({
    status: available ? "available" : "current",
    version: latestRelease.version,
  });
}

export function hasRecoverableInstaller(status) {
  return status?.status === "successful" && status.installPrompted === true;
}
