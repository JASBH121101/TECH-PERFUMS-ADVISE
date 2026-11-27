const CACHE_PREFIX = "jbae-pages-";
const CACHE_NAME = CACHE_PREFIX + "v1";

const scopeUrl = new URL(self.registration.scope);
const shellUrls = [
  scopeUrl.href,
  new URL("manifest.webmanifest", scopeUrl).href,
  new URL("icons/jbae-192.svg", scopeUrl).href,
  new URL("icons/jbae-512.svg", scopeUrl).href,
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const shellResponse = await fetch(scopeUrl.href);
    if (!shellResponse.ok) throw new Error("JBAE Pages shell could not be cached");
    await cache.put(scopeUrl.href, shellResponse.clone());

    const html = await shellResponse.text();
    const assets = [...html.matchAll(/\b(?:src|href)=["']([^"']+\.(?:js|css))(?:\?[^"']*)?["']/giu)]
      .map(match => new URL(match[1], scopeUrl))
      .filter(url => url.origin === scopeUrl.origin && url.href.startsWith(scopeUrl.href));
    await Promise.all(assets.map(async url => {
      try {
        const response = await fetch(url.href);
        if (response.ok) await cache.put(url.href, response);
      } catch { /* The shell remains installable if an optional asset is unavailable. */ }
    }));
    await cache.addAll(shellUrls.slice(1));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map(key => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== scopeUrl.origin || !requestUrl.href.startsWith(scopeUrl.href)) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(scopeUrl.href, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(request)) || (await caches.match(scopeUrl.href)) ||
          new Response("JBAE no está disponible sin conexión todavía.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
      }
    })());
    return;
  }

  const refresh = fetch(request).then(async response => {
    if (response.ok && response.type !== "opaque") {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  event.waitUntil(refresh.then(() => undefined));
  event.respondWith((async () => {
    const cached = await caches.match(request);
    return cached || (await refresh) || new Response("", { status: 503 });
  })());
});
