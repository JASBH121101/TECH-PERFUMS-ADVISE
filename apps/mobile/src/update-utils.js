const RELEASES_URL = "https://api.github.com/repos/JASBH121101/TECH-PERFUMS-ADVISE/releases?per_page=30";

export function compareVersions(left, right) {
  const a = String(left).split(".").map(value => Number.parseInt(value, 10));
  const b = String(right).split(".").map(value => Number.parseInt(value, 10));
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const av = Number.isFinite(a[index]) ? a[index] : 0;
    const bv = Number.isFinite(b[index]) ? b[index] : 0;
    if (av !== bv) return av > bv ? 1 : -1;
  }
  return 0;
}

export function parseJbaeRelease(release) {
  if (!release || typeof release !== "object" || release.draft || release.prerelease) return null;
  const match = /^jbae-v(\d+\.\d+\.\d+)$/u.exec(String(release.tag_name ?? ""));
  if (!match) return null;
  const version = match[1];
  const expectedUrl = "https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/releases/download/jbae-v" + version + "/JBAE.apk";
  const asset = Array.isArray(release.assets)
    ? release.assets.find(item => item?.name === "JBAE.apk" && item?.browser_download_url === expectedUrl)
    : null;
  if (!asset) return null;
  const versionCodeMatch = /versionCode=(\d+)/u.exec(String(release.body ?? ""));
  return Object.freeze({
    version,
    versionCode: versionCodeMatch ? Number(versionCodeMatch[1]) : 0,
    tag: release.tag_name,
    downloadUrl: expectedUrl,
    publishedAt: release.published_at ?? null,
    name: release.name ?? ("JBAE v" + version),
  });
}

export async function fetchLatestJbaeRelease(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetch implementation is required");
  const response = await fetchImpl(RELEASES_URL, {
    headers: { Accept: "application/vnd.github+json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("GitHub respondió HTTP " + response.status);
  const releases = await response.json();
  if (!Array.isArray(releases)) throw new TypeError("GitHub devolvió una lista de versiones no válida.");
  const accepted = releases.map(parseJbaeRelease).filter(Boolean);
  accepted.sort((left, right) => compareVersions(right.version, left.version));
  return accepted[0] ?? null;
}
