import "./styles.css";
import { DOMAINS } from "../../../src/index.js";
import { initializeStorage } from "./storage.js";
import { searchProducts } from "./search.js";

const app = document.querySelector("#app");
const nav = document.querySelector("#bottom-nav");
const runtimeLabel = document.querySelector("#runtime-label");
const state = { route: "home", detailsId: null, searchQuery: "", runtime: null, products: [] };

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/gu, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}
function displayList(value) {
  return Array.isArray(value) && value.length
    ? value.map(escapeHtml).join(", ")
    : "Sin dato en la ficha";
}

function renderHome() {
  const { fragranceCount, technologyCount, storageLabel, dataset } = state.runtime;
  return `
    <section class="hero">
      <div class="eyebrow"><span class="eyebrow-dot"></span> TU CENTRO DE DECISIONES</div>
      <h1>Elegir mejor.<br><span>Con información.</span></h1>
      <p>Dos asesores especializados, una experiencia independiente y una biblioteca que permanece en tu dispositivo.</p>
      <div class="hero-footer"><span class="hero-status"><i></i> MOTOR LOCAL DISPONIBLE</span><span class="hero-version">JBAE · 0.1</span></div>
    </section>
    <section class="section-heading"><div><span class="kicker">ÁREAS DE ASESORÍA</span><h2>¿Qué estás buscando?</h2></div></section>
    <div class="module-grid">
      <button class="module-card fragrance-card" type="button" data-route="fragrance">
        <span class="module-symbol fragrance-symbol">✧</span><span class="module-code">01 / FRAGRANCE</span>
        <strong>Encuentra tu<br>próxima fragancia.</strong>
        <span class="module-description">Explora notas, familias olfativas y concentraciones.</span>
        <span class="module-link">Abrir asesor <b>↗</b></span>
        <span class="module-count">${fragranceCount.toLocaleString("es-NI")} fichas locales</span>
      </button>
      <button class="module-card tech-card" type="button" data-route="tech">
        <span class="module-symbol tech-symbol">⌘</span><span class="module-code">02 / TECH</span>
        <strong>Compara antes<br>de comprar.</strong>
        <span class="module-description">Revisa dispositivos y criterios técnicos sin rankings universales.</span>
        <span class="module-link">Abrir asesor <b>↗</b></span>
        <span class="module-count">${technologyCount.toLocaleString("es-NI")} fichas locales</span>
      </button>
    </div>
    <section class="data-strip">
      <div class="data-strip-icon">◈</div>
      <div><span class="kicker">BIBLIOTECA PERSONAL</span><strong>${escapeHtml(dataset.title)}</strong><small>${fragranceCount.toLocaleString("es-NI")} perfumes · ${escapeHtml(storageLabel)}</small></div>
      <button type="button" class="icon-button" data-route="library" aria-label="Ver biblioteca">→</button>
    </section>
    <p class="footnote">Las fichas de fragancias proceden de un conjunto de datos identificado y fechado. Los datos reportados no equivalen a verificación independiente.</p>`;
}

function renderFragranceResults() {
  const target = document.querySelector("#fragrance-results");
  if (!target) return;
  const query = state.searchQuery.trim();
  if (!query) {
    target.innerHTML = `<div class="empty-panel"><span class="empty-symbol">⌕</span><strong>Busca una fragancia</strong><p>Prueba con el nombre, la casa, una familia olfativa o una nota.</p></div>`;
    return;
  }
  const matches = searchProducts(state.products, query, 30);
  target.innerHTML = matches.length
    ? `<div class="result-summary">${matches.length} resultados · catálogo local</div>${matches.map((product) => {
      const family = product.attributes.primaryScentFamily ?? product.attributes.scentFamilies?.[0] ?? "Familia no indicada";
      const concentration = product.attributes.concentrationLabel ?? "Concentración no indicada";
      return `<button class="result-card" type="button" data-action="open-fragrance" data-id="${encodeURIComponent(product.id)}">
        <span class="result-monogram">F</span><span class="result-copy"><strong>${escapeHtml(product.name)}</strong>
        <small>${escapeHtml(product.brand)} · ${escapeHtml(concentration)}</small><em>${escapeHtml(family)}</em></span><span class="result-arrow">↗</span>
      </button>`;
    }).join("")}`
    : `<div class="empty-panel compact"><strong>No encontramos coincidencias</strong><p>Revisa la escritura o prueba con la marca o una nota diferente.</p></div>`;
}

function renderFragrance() {
  return `
    <section class="page-intro fragrance-intro"><span class="kicker">MÓDULO 01 / FRAGRANCE</span>
      <h1>Tu perfil.<br><span>Tu fragancia.</span></h1>
      <p>Consulta una biblioteca local de perfumes y revisa lo que la ficha realmente contiene.</p>
      <div class="catalog-chip"><i></i> ${state.runtime.fragranceCount.toLocaleString("es-NI")} fichas disponibles sin conexión</div>
    </section>
    <section class="search-panel"><label for="fragrance-search">BUSCAR EN LA BIBLIOTECA</label>
      <div class="search-field"><span>⌕</span><input id="fragrance-search" type="search" autocomplete="off" placeholder="Perfume, marca, familia o nota..." value="${escapeHtml(state.searchQuery)}"><button type="button" id="clear-search" data-action="clear-search" aria-label="Limpiar búsqueda">×</button></div>
    </section>
    <section id="fragrance-results" class="results-list"></section>
    <p class="footnote">Fuente: Scento Perfume Database, snapshot 29-10-2026, licencia CC BY 4.0. Sus afirmaciones permanecen como reportadas hasta una comprobación independiente.</p>`;
}

function renderFragranceDetail(product) {
  const attributes = product.attributes ?? {};
  return `
    <section class="detail-top"><button type="button" class="back-link" data-action="back-to-fragrance">← Volver a fragancias</button>
      <span class="kicker">FICHA DE FRAGANCIA</span><div class="detail-monogram">F</div>
      <h1>${escapeHtml(product.name)}</h1><p class="detail-brand">${escapeHtml(product.brand)}</p>
      <div class="tag-row"><span>${escapeHtml(attributes.concentrationLabel ?? "Concentración no indicada")}</span><span>${escapeHtml(attributes.releaseYear ?? "Año no indicado")}</span></div>
    </section>
    <section class="detail-block"><span class="kicker">PERFIL OLFATIVO</span><h2>Familias y carácter</h2>
      <p>${displayList(attributes.scentFamilies)}</p>
      <div class="note-grid">
        <div><small>SALIDA</small><strong>${displayList(attributes.topNotes)}</strong></div>
        <div><small>CORAZÓN</small><strong>${displayList(attributes.middleNotes)}</strong></div>
        <div><small>FONDO</small><strong>${displayList(attributes.baseNotes)}</strong></div>
      </div>
    </section>
    <section class="detail-block"><span class="kicker">DETALLES DISPONIBLES</span><h2>Información de la ficha</h2>
      <dl class="fact-list">
        <div><dt>Perfumista</dt><dd>${displayList(attributes.perfumers)}</dd></div>
        <div><dt>Temporadas</dt><dd>${displayList(attributes.seasons)}</dd></div>
        <div><dt>Momentos del día</dt><dd>${displayList(attributes.timesOfDay)}</dd></div>
        <div><dt>Año de lanzamiento</dt><dd>${escapeHtml(attributes.releaseYear ?? "Sin dato")}</dd></div>
      </dl>
    </section>
    <aside class="evidence-note"><strong>Nota de evidencia</strong>
      <p>La información procede de la fuente identificada en el dataset. No demuestra por sí sola duración, proyección, rendimiento ni autenticidad. No mostramos horas de duración sin evidencia elegible.</p>
      <a href="${escapeHtml(attributes.sourceUrl ?? "https://www.scento.com/perfume-database")}" target="_blank" rel="noopener noreferrer">Consultar fuente ↗</a>
    </aside>`;
}

function renderTech() {
  const count = state.runtime.technologyCount;
  const products = count
    ? searchProducts(state.runtime.knowledgeStore.getProducts({ domain: DOMAINS.TECHNOLOGY }), state.searchQuery, 30)
    : [];
  return `
    <section class="page-intro tech-intro"><span class="kicker">MÓDULO 02 / TECH</span>
      <h1>Decide con<br><span>criterio técnico.</span></h1>
      <p>El asesor trabaja por categorías y atributos. No usa una puntuación universal para todos los dispositivos.</p>
      <div class="catalog-chip"><i></i> ${count.toLocaleString("es-NI")} productos guardados localmente</div>
    </section>
    ${count ? `
      <section class="search-panel"><label for="tech-search">BUSCAR DISPOSITIVO</label>
        <div class="search-field"><span>⌕</span><input id="tech-search" type="search" placeholder="Marca, modelo o especificación..." value="${escapeHtml(state.searchQuery)}"></div>
      </section>
      <section class="results-list">${products.map((product) => `<article class="result-card static-card"><span class="result-monogram">T</span><span class="result-copy"><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.brand)}</small><em>${escapeHtml(product.deviceType)}</em></span></article>`).join("") || '<div class="empty-panel compact"><strong>Sin coincidencias</strong><p>Prueba con otro modelo o especificación.</p></div>'}</section>
    ` : `
      <section class="roadmap-panel"><div class="roadmap-icon">⌘</div><span class="kicker">MÓDULO EN PREPARACIÓN</span>
        <h2>La base está lista.<br>El catálogo aún no.</h2>
        <p>La normalización técnica y el motor de comparación están en el núcleo. Esta primera entrega no incluye todavía un catálogo de dispositivos poblado ni resultados de investigación conectados a esta pantalla.</p>
        <div class="roadmap-check"><i></i><span>Motor de tecnología integrado</span></div>
        <div class="roadmap-check"><i></i><span>Almacenamiento local preparado</span></div>
        <div class="roadmap-pending"><i></i><span>Conexión de fuentes y carga de productos pendiente</span></div>
      </section>`}`;
}

function renderLibrary() {
  const { dataset, fragranceCount, technologyCount, evidenceCount, storageLabel } = state.runtime;
  const coverage = dataset.perfumeCount
    ? Math.round((dataset.perfumesWithCompleteNotePyramid / dataset.perfumeCount) * 1000) / 10
    : 0;
  return `
    <section class="page-intro library-intro"><span class="kicker">DATOS LOCALES</span><h1>Tu biblioteca<br><span>de conocimiento.</span></h1><p>Estado de almacenamiento, procedencia y cobertura del contenido cargado.</p></section>
    <section class="stats-grid">
      <div class="stat-card"><small>PERFUMES</small><strong>${fragranceCount.toLocaleString("es-NI")}</strong><span>fichas locales</span></div>
      <div class="stat-card"><small>TECNOLOGÍA</small><strong>${technologyCount.toLocaleString("es-NI")}</strong><span>productos locales</span></div>
      <div class="stat-card"><small>EVIDENCIAS</small><strong>${evidenceCount.toLocaleString("es-NI")}</strong><span>registros reportados</span></div>
      <div class="stat-card"><small>PIRÁMIDES</small><strong>${coverage}%</strong><span>con salida, corazón y fondo</span></div>
    </section>
    <section class="detail-block"><span class="kicker">ALMACENAMIENTO</span><h2>${escapeHtml(storageLabel)}</h2>
      <p>${state.runtime.native ? "La biblioteca se guarda en SQLite dentro de la aplicación Android." : "Esta vista previa utiliza memoria temporal. Cierra o recarga el navegador y los datos de esta sesión se perderán."}</p>
      <dl class="fact-list">
        <div><dt>Dataset</dt><dd>${escapeHtml(dataset.title)}</dd></div>
        <div><dt>Versión</dt><dd>${escapeHtml(dataset.version)}</dd></div>
        <div><dt>Fecha de corte</dt><dd>${escapeHtml(dataset.snapshotDate)}</dd></div>
        <div><dt>Licencia</dt><dd>CC BY 4.0</dd></div>
      </dl>
    </section>
    <aside class="evidence-note"><strong>Transparencia</strong><p>${escapeHtml(dataset.title)} aporta datos reportados; la cobertura indica presencia de campos, no exactitud ni verificación externa. La aplicación no convierte esos registros en claims independientes.</p><a href="https://www.scento.com/perfume-database" target="_blank" rel="noopener noreferrer">Fuente del dataset ↗</a></aside>`;
}

function renderError(error) {
  return `<section class="error-panel"><span>!</span><h1>No se pudo iniciar la biblioteca</h1>
    <p>${escapeHtml(error?.message ?? "Error de inicialización desconocido")}</p>
    <p>Los datos no se han sustituido por resultados de demostración. Revisa la compilación y la instalación del plugin SQLite.</p></section>`;
}
function updateNavigation() {
  nav.querySelectorAll("[data-route]").forEach((button) => {
    button.classList.toggle("active", button.dataset.route === state.route);
  });
}
function render() {
  if (!state.runtime) return;
  updateNavigation();
  if (state.detailsId) {
    const product = state.products.find((item) => item.id === state.detailsId);
    app.innerHTML = product ? renderFragranceDetail(product) : renderFragrance();
    return;
  }
  const views = { home: renderHome, fragrance: renderFragrance, tech: renderTech, library: renderLibrary };
  app.innerHTML = (views[state.route] ?? renderHome)();
  if (state.route === "fragrance") renderFragranceResults();
}
function navigate(route) {
  state.route = route;
  state.detailsId = null;
  state.searchQuery = "";
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

nav.addEventListener("click", (event) => {
  const button = event.target.closest("[data-route]");
  if (button) navigate(button.dataset.route);
});
document.querySelector(".brand").addEventListener("click", (event) => {
  event.preventDefault();
  navigate("home");
});
app.addEventListener("click", (event) => {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) { navigate(routeButton.dataset.route); return; }
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  if (actionButton.dataset.action === "open-fragrance") {
    state.detailsId = decodeURIComponent(actionButton.dataset.id);
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (actionButton.dataset.action === "back-to-fragrance") {
    state.detailsId = null;
    state.route = "fragrance";
    render();
  } else if (actionButton.dataset.action === "clear-search") {
    state.searchQuery = "";
    render();
    document.querySelector("#fragrance-search")?.focus();
  }
});
app.addEventListener("input", (event) => {
  if (event.target.id === "fragrance-search" || event.target.id === "tech-search") {
    state.searchQuery = event.target.value;
    if (event.target.id === "fragrance-search") {
      renderFragranceResults();
    } else {
      const selectionStart = event.target.selectionStart;
      const selectionEnd = event.target.selectionEnd;
      render();
      const input = document.querySelector("#tech-search");
      input?.focus();
      if (selectionStart !== null && selectionEnd !== null) input?.setSelectionRange(selectionStart, selectionEnd);
    }
  }
});

async function boot() {
  try {
    state.runtime = await initializeStorage();
    state.products = state.runtime.knowledgeStore.getProducts({ domain: DOMAINS.FRAGRANCE });
    runtimeLabel.textContent = state.runtime.native ? "OFFLINE READY" : "PREVIEW MODE";
    runtimeLabel.parentElement.classList.toggle("is-preview", !state.runtime.native);
    render();
  } catch (error) {
    runtimeLabel.textContent = "ERROR";
    runtimeLabel.parentElement.classList.add("is-error");
    app.innerHTML = renderError(error);
  }
}
boot();
window.addEventListener("beforeunload", () => {
  import("./storage.js").then(({ closeStorage }) => closeStorage()).catch(() => undefined);
});
