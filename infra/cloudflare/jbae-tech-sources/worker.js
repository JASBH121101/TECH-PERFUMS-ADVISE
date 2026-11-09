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

function parseRows(html) {
  const rows = new Map();
  for (const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/giu)) {
    const cells = [...rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/giu)]
      .map(match => cleanHtml(match[1]).replace(/\s+/gu, " ").trim())
      .filter(Boolean);
    if (cells.length >= 2) {
      rows.set(cells[0].normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLowerCase(), cells[1]);
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

function mapGsmaFacts(record) {
  const facts = [];
  const add = (key, label, value) => {
    if (value !== undefined && value !== null && value !== "") facts.push({ key, label, value });
  };
  add("name", "Modelo", record.name);
  add("brand", "Fabricante", record.brand);
  add("releaseDate", "Lanzamiento", record.announced ?? record.released);
  add("chipset", "Procesador / chipset", record.chipset ?? record.highlights?.chipset ?? record.specs?.Platform?.Chipset);
  add("gpu", "Gráficos", record.specs?.Platform?.GPU ?? record.gpu);
  add("ram", "Memoria RAM", record.ram_options_gb?.length ? record.ram_options_gb.map(value => value + " GB").join(" / ") : record.highlights?.ram ? record.highlights.ram + " GB" : null);
  add("storage", "Almacenamiento", record.storage_options_gb?.length ? record.storage_options_gb.map(value => value + " GB").join(" / ") : record.highlights?.storage);
  add("storageOptions", "Opciones de almacenamiento", record.storage_options_gb);
  add("displaySize", "Tamaño de pantalla", record.display_inches ?? record.highlights?.display_size ?? record.specs?.Display?.Size);
  add("displayResolution", "Resolución", record.display_resolution ?? record.highlights?.display_resolution ?? record.specs?.Display?.Resolution);
  add("refreshRate", "Frecuencia de pantalla", record.specs?.Display?.Type?.match?.(/\d{2,3}\s*Hz/iu)?.[0] ?? null);
  add("battery", "Batería", record.battery_mah ?? record.highlights?.battery);
  add("camera", "Cámara", record.main_camera_mp ?? record.highlights?.camera_mp);
  add("weight", "Peso", record.weight_g ?? record.highlights?.body);
  const os = record.specs?.Platform?.OS ?? record.highlights?.os;
  add("operatingSystem", "Sistema operativo", os);
  const connectivity = record.specs?.Network?.Technology ?? record.specs?.Comms?.WLAN;
  add("connectivity", "Conectividad", connectivity);
  return facts;
}

async function getGsma(query, env) {
  if (!env.APISH_KEY) return {
    status: "not_configured",
    source: null,
    facts: [],
    error: "GSMArena API no está conectada: falta configurar la clave API.SH como secreto APISH_KEY en Cloudflare.",
  };
  const endpoint = new URL("https://api.api.sh/gsmarena/v1/phone");
  endpoint.searchParams.set("q", query);
  const response = await fetch(endpoint, {
    headers: { "x-api-key": env.APISH_KEY, "Accept": "application/json" },
  });
  if (response.status === 404) return { status: "not_found", source: null, facts: [] };
  if (!response.ok) throw new Error("API.SH GSMArena respondió HTTP " + response.status);
  const payload = await response.json();
  const record = payload?.data ?? payload?.result ?? payload;
  if (!record || typeof record !== "object" || !record.name) {
    return { status: "not_found", source: null, facts: [] };
  }
  const facts = mapGsmaFacts(record);
  return {
    status: facts.length >= 4 ? "found" : "partial",
    source: {
      name: "GSMArena",
      url: typeof record.url === "string" && record.url.startsWith("https://www.gsmarena.com/") ? record.url : "https://www.gsmarena.com/",
      provider: "API.SH",
    },
    facts,
    retrievedAt: new Date().toISOString(),
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") ?? "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "GET") return json({ error: "Método no permitido." }, 405, origin);
    if (url.pathname === "/health") {
      return json({
        ok: true,
        sources: {
          xataka: true,
          gsmarena: Boolean(env.APISH_KEY),
          gsmarenaProvider: env.APISH_KEY ? "API.SH" : "not_configured",
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
        const result = await getGsma(query, env);
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
