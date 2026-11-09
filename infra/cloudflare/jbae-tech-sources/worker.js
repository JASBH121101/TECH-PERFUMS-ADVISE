const ALLOWED_ORIGINS = new Set([
  "https://jasbh121101.github.io",
  "capacitor://localhost",
  "http://localhost",
]);

const PRIMARY_BRANDS = new Set([
  "apple", "samsung", "google", "xiaomi", "motorola", "oneplus",
  "oppo", "vivo", "honor", "huawei", "realme", "sony", "asus",
  "nothing", "tecno", "infinix", "nokia", "lenovo", "zte", "poco",
]);

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "https://jasbh121101.github.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(origin),
    },
  });
}

async function readRobots(origin) {
  try {
    const response = await fetch(new URL("/robots.txt", origin), {
      headers: { "Accept": "text/plain", "User-Agent": "JBAE-Research/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return { ok: false, status: response.status, text: "" };
    if (new URL(response.url).origin !== origin) return { ok: false, status: 403, text: "" };
    return { ok: true, status: response.status, text: await response.text() };
  } catch {
    return { ok: false, status: 0, text: "" };
  }
}

function isAllowedByRobots(robotsText, pathname) {
  const rules = [];
  let active = false;
  let groupHasDirectives = false;
  for (const rawLine of robotsText.split(/\r?\n/u)) {
    const line = rawLine.split("#", 1)[0].trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === "user-agent") {
      if (groupHasDirectives) {
        active = false;
        groupHasDirectives = false;
      }
      if (value === "*") active = true;
      continue;
    }
    if (!active || (key !== "allow" && key !== "disallow")) continue;
    groupHasDirectives = true;
    if (value) rules.push({ allow: key === "allow", path: value });
  }
  const matches = rules.filter(rule => {
    const escaped = [...rule.path]
      .map(character => ".+?^()|[]\\".includes(character) ? "\\" + character : character)
      .join("")
      .replaceAll("*", ".*");
    return new RegExp("^" + escaped).test(pathname);
  }).sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow));
  return matches.length === 0 || matches[0].allow;
}

async function checkRobots(url) {
  const robots = await readRobots(url.origin);
  if (!robots.ok) {
    return { allowed: false, status: robots.status, reason: "No se pudo confirmar robots.txt de " + url.hostname + "; se evita consultar automáticamente." };
  }
  if (!isAllowedByRobots(robots.text, url.pathname + url.search)) {
    return { allowed: false, status: 403, reason: "robots.txt no permite la consulta automática de esta ruta." };
  }
  return { allowed: true, status: 200 };
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;|&#160;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;|&apos;/giu, "'")
    .replace(/&#(\d+);/gu, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/giu, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function cleanHtml(fragment) {
  return decodeEntities(String(fragment ?? "")
    .replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/giu, " ")
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<\/(?:p|li|tr|td|th|div|h[1-6]|section|article)>/giu, "\n")
    .replace(/<[^>]+>/gu, " "))
    .replace(/[ \t\f\v]+/gu, " ")
    .replace(/\n[ \t]+/gu, "\n")
    .replace(/\n{2,}/gu, "\n")
    .trim();
}

function normalizeLabel(value) {
  return cleanHtml(value).normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLowerCase().trim();
}

function parseRows(html) {
  const rows = new Map();
  let section = "";
  for (const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/giu)) {
    const header = rowMatch[1].match(/<th\b[^>]*>([\s\S]*?)<\/th>/iu);
    const cells = [...rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/giu)]
      .map(match => cleanHtml(match[1]).replace(/\s+/gu, " ").trim())
      .filter(Boolean);
    if (header && cells.length <= 1) {
      section = normalizeLabel(header[1]);
      continue;
    }
    if (cells.length >= 2) {
      const label = normalizeLabel(cells[0]);
      rows.set(section + "|" + label, cells[1]);
      rows.set(label, cells[1]);
    }
  }
  return rows;
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function number(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.replace(/\s/gu, "").match(/(\d+(?:[.,]\d+)?)/u);
  return match ? Number(match[1].replace(",", ".")) : null;
}

function parseXataka(html, slug, url) {
  const text = cleanHtml(html);
  const rows = parseRows(html);
  const row = (...labels) => {
    for (const label of labels) {
      const key = label.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLowerCase();
      if (rows.has(key)) return rows.get(key);
    }
    return null;
  };
  const h1 = firstMatch(html, [/<h1\b[^>]*>([\s\S]*?)<\/h1>/iu]);
  const name = h1 ? cleanHtml(h1) : slug.replace(/-/gu, " ");
  const facts = [];
  const add = (key, label, value) => {
    if (value !== null && value !== undefined && value !== "") {
      facts.push({ key, label, value });
    }
  };

  add("name", "Modelo", name);
  const release = firstMatch(text, [/Lanzado\s+(?:en\s+)?([^\n]+)/iu]);
  add("releaseDate", "Lanzamiento", release);
  add("chipset", "Procesador / chipset",
    row("Procesador", "SoC") ??
    firstMatch(text, [/(?:Procesador|SoC)\s*\n\s*([^\n]+)/iu]));
  add("ram", "Memoria RAM",
    row("RAM") ?? firstMatch(text, [/(?:^|\n)RAM\s*\n\s*([^\n]+)/iu]));
  add("storage", "Almacenamiento",
    row("Almacenamiento") ?? firstMatch(text, [/(?:^|\n)Almacenamiento\s*\n\s*([^\n]+)/iu]));
  add("displaySize", "Tamaño de pantalla",
    row("Pantalla") ?? firstMatch(text, [/(?:^|\n)Pantalla\s*\n\s*([^\n]+)/iu]));
  add("weight", "Peso",
    row("Peso") ?? firstMatch(text, [/(?:^|\n)Peso\s*\n\s*([^\n]+)/iu]));
  add("operatingSystem", "Sistema operativo",
    row("Software", "Sistema operativo") ??
    firstMatch(text, [/(?:Sistema operativo|Software)\s*\n\s*([^\n]+)/iu]));
  add("camera", "Cámara",
    row("Cámara", "Camaras", "Cámaras") ??
    firstMatch(text, [/(?:^|\n)Cámara\s*\n\s*([^\n]+)/iu]));
  add("battery", "Batería",
    row("Batería") ?? firstMatch(text, [/(?:^|\n)Batería\s*\n\s*([^\n]+)/iu]));
  add("connectivity", "Conectividad",
    row("Red móvil") ?? firstMatch(text, [/(?:^|\n)Red móvil\s*\n\s*([^\n]+)/iu]));

  const resolution = firstMatch(text, [
    /Resolución\s*\n\s*([^\n]+)/iu,
    /\b(\d{3,4}\s*[x×]\s*\d{3,4}\s*(?:px|píxeles)?)\b/iu,
  ]);
  add("displayResolution", "Resolución", resolution);
  const refresh = firstMatch(text, [
    /Tasa de refresco\s*\n\s*([^\n]+)/iu,
    /\b(\d{2,3}\s*Hz)\b/iu,
  ]);
  add("refreshRate", "Frecuencia de pantalla", refresh);
  const gpu = firstMatch(text, [/(?:^|\n)GPU\s*\n\s*([^\n]+)/iu]);
  add("gpu", "Gráficos", gpu);

  const versionsText = text.match(/RAM\s*\/\s*Almacenamiento en cada versión:([\s\S]{0,900}?)(?:Precio oficial|Algunos precios|Dónde comprar)/iu)?.[1] ?? "";
  const variantPairs = [...versionsText.matchAll(/(\d{1,3})\s*\/\s*(\d{2,5})\s*GB/giu)];
  const ramOptions = [...new Set(variantPairs.map(match => Number(match[1])))].sort((a,b)=>a-b);
  const storageOptions = [...new Set(variantPairs.map(match => Number(match[2])))].sort((a,b)=>a-b);
  if (ramOptions.length) add("ram", "Memoria RAM", ramOptions.map(value => value + " GB").join(" / "));
  if (storageOptions.length) {
    add("storageOptions", "Opciones de almacenamiento", storageOptions.map(value => value + " GB").join(" / "));
    if (!facts.some(fact => fact.key === "storage")) {
      add("storage", "Almacenamiento", storageOptions.map(value => value + " GB").join(" / "));
    }
  }

  const ratings = text.match(/Benchmarking y valoración de Xataka\s+(\d+(?:[.,]\d+)?)\s*\/\s*10/iu);
  add("reviewRating", "Valoración de Xataka", ratings?.[1] ?? null);

  if (facts.length < 4) {
    throw new Error("Xataka devolvió una página, pero no se pudieron extraer suficientes datos técnicos.");
  }
  return {
    status: "found",
    source: { name: "Xataka La Cacharrería", url, license: "Consulta de ficha pública; respetar derechos y atribución." },
    facts,
    variants: variantPairs.map(match => ({ ramGB: Number(match[1]), storageGB: Number(match[2]) })),
    retrievedAt: new Date().toISOString(),
  };
}

function xatakaCandidateUrls(slug) {
  const first = slug.split("-")[0];
  if (!PRIMARY_BRANDS.has(first)) return [];
  const model = slug.slice(first.length + 1);
  if (!model) return [];
  return [
    "https://www.xataka.com/la-cacharreria/" + first + "/" + model,
    "https://www.xataka.com/la-cacharreria/" + first + "/" + model + "/amp",
  ];
}

async function getXataka(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) {
    throw new Error("El slug de Xataka no es válido.");
  }
  const urls = xatakaCandidateUrls(slug);
  if (!urls.length) return { status: "not_found", source: null, facts: [] };
  const policy = await checkRobots(new URL(urls[0]));
  if (!policy.allowed) {
    return {
      status: "blocked",
      source: { name: "Xataka La Cacharrería", url: urls[0] },
      facts: [],
      variants: [],
      error: policy.reason,
    };
  }
  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.7",
        },
        redirect: "follow",
      });
      if (response.status === 404) continue;
      if (!response.ok) {
        lastError = "Xataka respondió HTTP " + response.status;
        continue;
      }
      const html = await response.text();
      if (!html.includes("la-cacharreria") && !html.includes("La Cacharrería")) {
        lastError = "La página recibida no corresponde a La Cacharrería.";
        continue;
      }
      return parseXataka(html, slug, response.url || url);
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Error consultando Xataka.";
    }
  }
  return {
    status: lastError ? "error" : "not_found",
    source: null,
    facts: [],
    error: lastError ?? "No existe una ficha de La Cacharrería para este modelo.",
  };
}

function extractVariantPairs(value) {
  const pattern = /(\d+(?:\.\d+)?\s*(?:GB|TB))\s*(\d+(?:\.\d+)?\s*GB)\s*RAM/giu;
  const values = [...String(value ?? "").matchAll(pattern)].map(match => ({
    storage: match[1].replace(/\s+/gu, "").toUpperCase(),
    ram: match[2].replace(/\s+/gu, "").toUpperCase(),
  }));
  return [...new Map(values.map(item => [item.storage + "|" + item.ram, item])).values()];
}

function uniqueJoined(values) {
  return [...new Set(values.filter(Boolean))].join(" / ");
}

function parseGsmaPage(html, url, fallbackName) {
  const rows = parseRows(html);
  const row = (section, ...labels) => {
    for (const label of labels) {
      const key = normalizeLabel(label);
      const value = rows.get(normalizeLabel(section) + "|" + key) ?? rows.get(key);
      if (value) return value;
    }
    return null;
  };
  const title = firstMatch(html, [/<h1\b[^>]*>([\s\S]*?)<\/h1>/iu]);
  const name = title ? cleanHtml(title) : fallbackName;
  const facts = [];
  const add = (key, label, value) => {
    if (value !== null && value !== undefined && value !== "") facts.push({ key, label, value });
  };
  add("name", "Modelo", name);
  add("releaseDate", "Lanzamiento", [row("Launch", "Announced"), row("Launch", "Status")].filter(Boolean).join(" · ") || null);
  add("dimensions", "Dimensiones", row("Body", "Dimensions"));
  add("weight", "Peso", row("Body", "Weight"));
  add("build", "Construcción", row("Body", "Build"));
  add("displayTechnology", "Tecnología de pantalla", row("Display", "Type"));
  add("displaySize", "Tamaño de pantalla", row("Display", "Size"));
  add("displayResolution", "Resolución", row("Display", "Resolution"));
  add("operatingSystem", "Sistema operativo", row("Platform", "OS"));
  add("chipset", "Procesador / chipset", row("Platform", "Chipset"));
  add("cpu", "CPU", row("Platform", "CPU"));
  add("gpu", "GPU", row("Platform", "GPU"));
  const internal = row("Memory", "Internal");
  const variants = extractVariantPairs(internal);
  add("ram", "Memoria RAM", variants.length ? uniqueJoined(variants.map(item => item.ram.replace("GB", " GB"))) : null);
  add("storage", "Almacenamiento", variants.length ? uniqueJoined(variants.map(item => item.storage.replace("GB", " GB"))) : internal);
  add("storageOptions", "Opciones de almacenamiento", variants.length ? uniqueJoined(variants.map(item => item.storage.replace("GB", " GB"))) : null);
  add("memoryCard", "Tarjeta de memoria", row("Memory", "Card slot"));
  add("camera", "Cámaras traseras", uniqueJoined([...rows.entries()].filter(([key]) => key.startsWith("main camera|")).map(([, value]) => value)));
  add("frontCamera", "Cámara frontal", uniqueJoined([...rows.entries()].filter(([key]) => key.startsWith("selfie camera|")).map(([, value]) => value)));
  add("battery", "Batería", row("Battery", "Type"));
  add("charging", "Carga", row("Battery", "Charging"));
  add("connectivity", "Conectividad", uniqueJoined([
    row("Network", "Technology"), row("Comms", "WLAN"), row("Comms", "Bluetooth"),
    row("Comms", "NFC"), row("Comms", "USB"),
  ]));
  add("sensors", "Sensores", row("Features", "Sensors"));
  add("colors", "Colores", row("Misc", "Colors"));
  return { status: facts.length >= 6 ? "found" : facts.length ? "partial" : "not_found",
    source: { name: "GSMArena", url }, facts, variants, retrievedAt: new Date().toISOString() };
}

function gsmaBlocked(status, url) {
  return {
    status: "error", source: { name: "GSMArena", url }, facts: [], variants: [],
    error: status === 402 || status === 403 || status === 429
      ? "GSMArena no permitió esta consulta automatizada gratuita (HTTP " + status + "). No se usa ningún servicio de pago; abrí la ficha de GSMArena para verificarla manualmente."
      : "GSMArena respondió HTTP " + status + ".",
  };
}

async function getGsma(query) {
  const searchUrl = new URL("https://www.gsmarena.com/results.php3");
  searchUrl.searchParams.set("sQuickSearch", query);
  const policy = await checkRobots(searchUrl);
  if (!policy.allowed) {
    return {
      status: "blocked",
      source: { name: "GSMArena", url: searchUrl.toString() },
      facts: [],
      variants: [],
      error: policy.reason,
    };
  }
  const headers = { "Accept": "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9" };
  const searchResponse = await fetch(searchUrl, { headers, redirect: "follow", signal: AbortSignal.timeout(14000) });
  if (!searchResponse.ok) return gsmaBlocked(searchResponse.status, searchUrl.toString());
  const searchHtml = await searchResponse.text();
  if (/turnstile check|cf-chl-|challenge-platform|verify you are human/iu.test(searchHtml)) {
    return {
      status: "blocked",
      source: { name: "GSMArena", url: searchUrl.toString() },
      facts: [],
      variants: [],
      error: "GSMArena devolvió una verificación Turnstile. JBAE no intenta eludirla; abrí el enlace de GSMArena para consultar la ficha.",
    };
  }
  const tokens = query.toLowerCase().split(/[^a-z0-9]+/u).filter(token => token.length > 1);
  const candidates = [];
  for (const match of searchHtml.matchAll(/<a\b[^>]*href=["']([^"']+\.php(?:\?[^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/giu)) {
    const href = match[1];
    if (!/[a-z0-9_]+-\d+\.php$/iu.test(href) || /-review-\d+\.php$/iu.test(href)) continue;
    const title = cleanHtml(match[2]) || href.split("/").pop().replace(/-\d+\.php.*$/iu, "").replace(/_/gu, " ");
    const score = tokens.filter(token => title.toLowerCase().includes(token)).length;
    if (score) candidates.push({ href: new URL(href, "https://www.gsmarena.com/").toString(), title, score });
  }
  candidates.sort((a, b) => b.score - a.score);
  const candidate = candidates[0];
  if (!candidate || candidate.score < Math.min(2, tokens.length)) {
    return { status: "not_found", source: { name: "GSMArena", url: searchUrl.toString() },
      facts: [], variants: [], error: "No se encontró una coincidencia en los resultados de GSMArena." };
  }
  const detailResponse = await fetch(candidate.href, { headers, redirect: "follow", signal: AbortSignal.timeout(14000) });
  if (!detailResponse.ok) return gsmaBlocked(detailResponse.status, candidate.href);
  return parseGsmaPage(await detailResponse.text(), detailResponse.url || candidate.href, candidate.title);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") ?? "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "GET") return json({ error: "Método no permitido." }, 405, origin);
    if (url.pathname === "/probe") {
      const targets = [
        "https://www.gsmarena.com/robots.txt",
        "https://www.xataka.com/robots.txt",
        "https://www.gsmarena.com/results.php3?sQuickSearch=Samsung%20Galaxy%20A17",
        "https://www.xataka.com/la-cacharreria/samsung/galaxy-a32-5g",
      ];
      const results = [];
      for (const target of targets) {
        const targetUrl = new URL(target);
        if (targetUrl.pathname === "/robots.txt") {
          const robots = await readRobots(targetUrl.origin);
          results.push({
            requestedUrl: target,
            finalUrl: robots.ok ? target : null,
            status: robots.ok ? 200 : robots.status || 403,
            title: "robots.txt",
            bytes: robots.text.length,
            error: robots.ok ? null : "No se pudo verificar robots.txt sin redirección externa.",
          });
          continue;
        }
        const policy = await checkRobots(targetUrl);
        if (!policy.allowed) {
          results.push({
            requestedUrl: target,
            finalUrl: null,
            status: policy.status || 403,
            title: null,
            bytes: 0,
            error: policy.reason,
          });
          continue;
        }
        try {
          const response = await fetch(targetUrl, {
            headers: { "Accept": "text/html,application/xhtml+xml" },
            redirect: "follow",
            signal: AbortSignal.timeout(10000),
          });
          const html = await response.text();
          const titleHtml = firstMatch(html, [/<title\b[^>]*>([\s\S]*?)<\/title>/iu]);
          results.push({
            requestedUrl: target,
            finalUrl: response.url || target,
            status: response.status,
            title: titleHtml ? cleanHtml(titleHtml) : null,
            bytes: html.length,
            error: response.ok ? null : "La página respondió HTTP " + response.status,
          });
        } catch (error) {
          results.push({
            requestedUrl: target,
            finalUrl: null,
            status: 0,
            title: null,
            bytes: 0,
            error: error instanceof Error ? error.message : "No se pudo consultar la página.",
          });
        }
      }
      const sourceChecks = await Promise.all([
        getGsma("Samsung Galaxy A17"),
        getXataka("samsung-galaxy-a32-5g"),
      ]);
      for (let index = 0; index < sourceChecks.length; index += 1) {
        const source = sourceChecks[index];
        const fallbackUrl = index === 0
          ? "https://www.gsmarena.com/results.php3?sQuickSearch=Samsung%20Galaxy%20A17"
          : "https://www.xataka.com/la-cacharreria/samsung/galaxy-a32-5g";
        results.push({
          requestedUrl: source.source?.url ?? fallbackUrl,
          finalUrl: source.source?.url ?? null,
          status: source.status === "found" || source.status === "partial" ? 200 : source.status === "blocked" ? 403 : source.status === "error" ? 502 : 404,
          title: source.name ?? (index === 0 ? "GSMArena" : "Xataka"),
          bytes: source.facts?.length ?? 0,
          error: source.error ?? null,
          facts: source.facts?.length ?? 0,
          variants: source.variants?.length ?? 0,
        });
      }
      return json({ ok: true, results }, 200, origin);
    }
    if (url.pathname === "/health") {
      return json({
        ok: true,
        sources: {
          xataka: true,
          gsmarena: true,
          gsmarenaProvider: "public_html_no_paid_api",
        },
      }, 200, origin);
    }
    try {
      if (url.pathname === "/xataka") {
        const slug = url.searchParams.get("slug") ?? "";
        const cache = caches.default;
        const key = new Request("https://jbae-tech-sources/cache/xataka/" + encodeURIComponent(slug));
        const cached = await cache.match(key);
        if (cached) {
          const body = await cached.json();
          return json(body, 200, origin);
        }
        const result = await getXataka(slug);
        const response = json(result, 200, origin);
        if (result.status === "found") {
          await cache.put(key, new Response(JSON.stringify(result), {
            headers: { "Cache-Control": "public, max-age=21600", "Content-Type": "application/json" },
          }));
        }
        return response;
      }
      if (url.pathname === "/gsmarena/phone") {
        const query = (url.searchParams.get("q") ?? "").trim();
        if (query.length < 2 || query.length > 120) return json({ error: "El nombre del dispositivo no es válido." }, 400, origin);
        const result = await getGsma(query);
        return json(result, 200, origin);
      }
      return json({ error: "Ruta no encontrada." }, 404, origin);
    } catch (error) {
      return json({
        status: "error",
        error: error instanceof Error ? error.message : "Error consultando fuentes TECH.",
      }, 502, origin);
    }
  },
};
