const BASE_VERSION_PATTERN = /^(\d+)\.(\d+)\.\d+$/u;

export function resolveReleaseVersion(baseVersion, runNumber) {
  if (typeof baseVersion !== "string") {
    throw new TypeError("The mobile package version must be a string.");
  }
  const match = BASE_VERSION_PATTERN.exec(baseVersion);
  if (!match) {
    throw new TypeError("The mobile package version must use MAJOR.MINOR.PATCH.");
  }

  const numericRun = Number(runNumber);
  if (!Number.isSafeInteger(numericRun) || numericRun < 1) {
    throw new TypeError("The Android release run number must be a positive integer.");
  }

  return String(Number(match[1])) + "." + String(Number(match[2])) + "." + numericRun;
}
