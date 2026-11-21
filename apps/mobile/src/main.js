import "./styles.css";
import { formatFragranceConcentration, localizeFragranceList } from "./fragrance-localization.js";
import { safeExternalUrl } from "./safe-external-url.js";
import { DOMAINS, buildFragranceComparison } from "../../../src/index.js";
import { closeStorage, initializeStorage } from "./storage.js";
import { initializeUpdateManager } from "./update-manager.js";
import { searchProducts } from "./search.js";
import { searchTechnologyCatalog } from "./technology-catalog-search.js";
import { buildFragranceAdvice } from "./personalization.js";
import { filterFragranceCollection, setComparisonSelection } from "./collection-flows.js";
import { createRequestGuard } from "./request-guard.js";
import {
  lookupTechnology,
  slugifyTechnologyModel,
  buildPrimarySpecSourceLinks,
} from "./technology-lookup.js";
import {
  buildTechnologyComparison,
  TECHNOLOGY_COMPARISON_LOOKUP_FIELDS,
  TECHNOLOGY_COMPARISON_METRICS,
  TECHNOLOGY_COMPARISON_PROFILES,
  buildTechnologyApprovalCandidate,
  saveTechnologyCandidate,
  formatTechnologyFactValue,
} from "./technology-comparison.js";

const app = document.querySelector("#app");
const nav = document.querySelector("#bottom-nav");
const runtimeLabel = document.querySelector("#runtime-label");
const techLookupGuard = createRequestGuard();
const techComparisonGuard = createRequestGuard();

const FRAGRANCE_FAMILY_OPTIONS = Object.freeze([
  { value: "woody", label: "Amaderada" },
  { value: "citrus", label: "Cítrica" },
  { value: "floral", label: "Floral" },
  { value: "aromatic", label: "Aromática" },
  { value: "aquatic", label: "Acuática" },
  { value: "gourmand", label: "Dulce / gourmand" },
  { value: "amber", label: "Ambarada" },
  { value: "spicy", label: "Especiada" },
  { value: "green", label: "Verde" },
  { value: "fruity", label: "Frutal" },
  { value: "powdery", label: "Empolvada" },
  { value: "musky", label: "Almizclada" },
  { value: "leather", label: "Cuero / ahumada" },
  { value: "mineral", label: "Mineral / salina" },
  { value: "oud", label: "Oud" },
]);

const state = {
  route: "home",
  detailsId: null,
  searchQuery: "",
  runtime: null,
  products: [],
  fragranceMode: "advisor",
  collectionSearch: "",
  collectionFilter: "all",
  editingCollectionNoteId: null,
  comparisonSearch: "",
  comparisonSelection: [],
  comparisonResult: null,
  fragrancePrompt: "",
  fragranceForm: { occasion: "", families: [], avoidFamilies: [], notes: "", avoidNotes: "", climate: "", intensity: "" },
  profile: null,
  profileMessage: "",
  adviceResult: null,
  techModel: "",
  techLookupSelection: null,
  techLookupSuggestionToken: 0,
  techCompareSelections: [null, null, null, null],
  techCompareSuggestionTokens: [0, 0, 0, 0],
  techResource: "smartphones",
  techLookupStatus: "idle",
  techLookupResult: null,
  techMode: "lookup",
  techCompareModels: ["", "", "", ""],
  techCompareMetric: "general",
  techComparisonStatus: "idle",
  techComparisonResult: null,
  techSaveStatus: "idle",
  techSaveMessage: "",
  techSavedProductId: null,
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/gu, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function renderValue(value) {
  if (value === null || value === undefined || value === "") return "Sin dato publicado";
  if (Array.isArray(value)) return value.map(item => typeof item === "object" ? JSON.stringify(item) : String(item)).join(", ");
  if (typeof value === "object") return Object.entries(value)
    .map(([key, item]) => key + ": " + (typeof item === "object" ? JSON.stringify(item) : String(item)))
    .join(" · ");
  return String(value);
}

function displayList(value, type = "note") {
  return escapeHtml(localizeFragranceList(value, type));
}

function renderHome() {
  const { fragranceCount, technologyCount, storageLabel, dataset } = state.runtime;
  return `
    <section class="hero">
      <div class="eyebrow"><span class="eyebrow-dot"></span> TU CENTRO DE DECISIONES</div>
      <h1>Elegir mejor.<br><span>Con información.</span></h1>
      <p>Asesoría especializada en fragancias y tecnología, con datos identificados y criterios transparentes.</p>
      <div class="hero-footer"><span class="hero-status"><i></i> BIBLIOTECA LOCAL DISPONIBLE</span><span class="hero-version">JBAE · ${escapeHtml(import.meta.env.VITE_APP_VERSION || "PREVIEW")}</span></div>
    </section>
    <section class="home-stats">
      <div class="home-stat"><small>FRAGANCIAS OFFLINE</small><strong>${fragranceCount.toLocaleString("es-NI")}</strong><span>Fichas listas para consulta en el dispositivo</span></div>
      <div class="home-stat"><small>TECNOLOGÍA</small><strong>Consulta online</strong><span>Fuentes públicas por modelo exacto; resultados pendientes de revisión</span></div>
    </section>
    <section class="data-strip">
      <div class="data-strip-icon">◈</div>
      <div><span class="kicker">BIBLIOTECA PERSONAL</span><strong>${escapeHtml(dataset.title)}</strong><small>${fragranceCount.toLocaleString("es-NI")} perfumes · ${escapeHtml(storageLabel)}</small></div>
    </section>
    <section class="home-note"><strong>La navegación está abajo.</strong><p>En Fragancias puedes pedir una recomendación basada en tus preferencias o buscar una ficha por nombre, casa, familia o nota. En TECH puedes consultar fuentes de especificaciones por modelo.</p></section>
    <p class="footnote">${technologyCount.toLocaleString("es-NI")} productos de tecnología guardados localmente. Los datos de fuentes externas se muestran como candidatos hasta su revisión.</p>`;
}

function renderModeTabs() {
  const modes = [
    ["advisor", "Asesor"],
    ["search", "Buscar"],
    ["collection", "Mi colección"],
    ["compare", "Comparar"],
  ];
  return `
    <div class="mode-tabs fragrance-mode-tabs" role="tablist" aria-label="Secciones de fragancias">
      ${modes.map(([mode, label]) => `
        <button type="button" class="mode-tab ${state.fragranceMode === mode ? "active" : ""}"
          data-action="fragrance-mode" data-mode="${mode}" role="tab"
          aria-selected="${state.fragranceMode === mode}">${label}</button>`).join("")}
    </div>`;
}

function renderFragranceAdvisorForm() {
  const f = state.fragranceForm;
  return `
    <section class="profile-panel" aria-live="polite">
      <div><span class="kicker">PERFIL LOCAL INTELIGENTE</span><strong>Tu memoria olfativa</strong></div>
      <p>${state.profile?.feedback?.length ?? 0} valoraciones guardadas. El motor detecta tendencias cuando una familia o nota se repite en al menos dos fragancias valoradas.</p>
      <small>${escapeHtml(state.profileMessage || (state.runtime.native ? "Se conserva en SQLite en este dispositivo." : "Vista previa web: la memoria se reinicia al cerrar o recargar."))}</small>
    </section>
    <form id="fragrance-advisor-form" class="advisor-form">
      <div class="form-heading"><strong>Cuéntame qué estás buscando</strong><p>Escribe como lo dirías a un asesor. También puedes añadir filtros para que la recomendación respete tus preferencias.</p></div>
      <div class="field-group">
        <label for="fragrance-prompt">DESCRIBE TU PERFIL</label>
        <textarea id="fragrance-prompt" name="message" maxlength="2000" placeholder="Ej.: Busco algo amaderado para uso diario, en clima caliente, fresco y que no sea hostigoso. Me gustan las notas de vainilla...">${escapeHtml(state.fragrancePrompt)}</textarea>
        <span class="field-hint">El motor reconoce ocasión, familias, notas que te gustan o quieres evitar, carácter e intensidad cuando aparecen expresamente.</span>
      </div>
      <div class="field-group">
        <label for="fragrance-occasion">¿PARA QUÉ OCASIÓN?</label>
        <select id="fragrance-occasion" name="occasion">
          <option value="">Cualquier ocasión</option>
          <option value="day" ${f.occasion === "day" ? "selected" : ""}>Uso diario</option>
          <option value="office" ${f.occasion === "office" ? "selected" : ""}>Trabajo / oficina</option>
          <option value="evening" ${f.occasion === "evening" ? "selected" : ""}>Noche / cita</option>
        </select>
      </div>
      <fieldset class="field-group family-fieldset">
        <legend>¿QUÉ FAMILIAS OLFATIVAS TE GUSTAN?</legend>
        <span class="field-hint">Puedes seleccionar varias. Por ejemplo: amaderada + cítrica.</span>
        <div class="family-choice-grid">
          ${FRAGRANCE_FAMILY_OPTIONS.map(option => `
            <label class="family-choice">
              <input type="checkbox" name="fragrance-family" value="${option.value}" ${f.families.includes(option.value) ? "checked" : ""}>
              <span>${option.label}</span>
            </label>`).join("")}
        </div>
      </fieldset>
      <fieldset class="field-group family-fieldset">
        <legend>¿QUÉ FAMILIAS OLFATIVAS QUIERES EVITAR?</legend>
        <span class="field-hint">Estas familias se aplican como exclusiones, no como preferencias suaves.</span>
        <div class="family-choice-grid">
          ${FRAGRANCE_FAMILY_OPTIONS.map(option => `
            <label class="family-choice">
              <input type="checkbox" name="fragrance-avoid-family" value="${option.value}" ${f.avoidFamilies.includes(option.value) ? "checked" : ""}>
              <span>${option.label}</span>
            </label>`).join("")}
        </div>
      </fieldset>
      <div class="field-group">
        <label for="fragrance-notes">¿QUÉ NOTAS ESPECÍFICAS PREFIERES?</label>
        <input id="fragrance-notes" name="notes" type="text" autocomplete="off" value="${escapeHtml(f.notes)}" placeholder="Ej.: cedro, bergamota, vetiver">
        <span class="field-hint">Puedes escribir varias separadas por comas. El motor busca las notas presentes en la biblioteca.</span>
      </div>
      <div class="field-group">
        <label for="fragrance-avoid-notes">¿QUÉ NOTAS QUIERES EVITAR?</label>
        <input id="fragrance-avoid-notes" name="avoidNotes" type="text" autocomplete="off" value="${escapeHtml(f.avoidNotes)}" placeholder="Ej.: coco, pachulí">
        <span class="field-hint">Se excluyen las opciones que incluyan esas notas cuando la ficha permite comprobarlo.</span>
      </div>
      <div class="field-group">
        <label for="fragrance-climate">¿EN QUÉ CLIMA LA USARÁS?</label>
        <select id="fragrance-climate" name="climate">
          <option value="">Cualquier clima</option>
          <option value="hot_humid" ${f.climate === "hot_humid" ? "selected" : ""}>Caluroso / húmedo / tropical</option>
          <option value="cold" ${f.climate === "cold" ? "selected" : ""}>Frío / fresco</option>
        </select>
        <span class="field-hint">El clima solo se puntúa cuando la ficha trae etiquetas compatibles.</span>
      </div>
      <div class="field-group">
        <label for="fragrance-intensity">¿QUÉ INTENSIDAD TE GUSTA?</label>
        <select id="fragrance-intensity" name="intensity">
          <option value="">No es un criterio obligatorio</option>
          <option value="soft" ${f.intensity === "soft" ? "selected" : ""}>Suave / discreta</option>
          <option value="moderate" ${f.intensity === "moderate" ? "selected" : ""}>Moderada</option>
          <option value="strong" ${f.intensity === "strong" ? "selected" : ""}>Intensa</option>
        </select>
        <span class="field-hint">No se inventa la intensidad: si el catálogo no la registra, el motor la marcará como dato faltante.</span>
      </div>
      <button class="primary-action" type="submit">Guardar perfil y analizar <span>↗</span></button>
    </form>
    <section id="advice-results" class="advice-results"></section>`;
}

function renderAdviceResults() {
  const target = document.querySelector("#advice-results");
  if (!target || !state.adviceResult) return;
  const result = state.adviceResult;
  if (result.status === "needs_preferences") {
    target.innerHTML = `<div class="empty-panel compact"><strong>Cuéntame un poco más</strong><p>Escribe una ocasión, una familia olfativa o alguna nota que te guste. No voy a recomendar por adivinar.</p></div>`;
    return;
  }
  if (result.status === "error") {
    target.innerHTML = `<div class="warning-panel"><strong>No pude completar el análisis.</strong>${escapeHtml(result.error)}</div>`;
    return;
  }
  if (result.status === "insufficient_coverage" || result.status === "partial_matches") {
    const top = result.match?.ranking?.[0];
    const missing = top?.breakdown?.filter(item => item.score === null).map(item => item.key) ?? [];
    const alternatives = (result.alternatives ?? []).map((item, index) => {
      const product = state.products.find(candidate => candidate.id === item.id);
      const family = product?.attributes?.primaryScentFamily ?? product?.attributes?.scentFamilies?.[0] ?? "Familia no indicada";
      const reasons = item.reasons?.length
        ? `<ul class="advice-reasons">${item.reasons.slice(0, 3).map(reason => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>`
        : "";
      return `
        <button type="button" class="advice-card partial-advice-card" data-action="open-fragrance" data-id="${encodeURIComponent(item.id)}">
          <div class="advice-card-head">
            <span class="advice-rank">${String(index + 1).padStart(2, "0")}</span>
            <span class="advice-card-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(product?.brand ?? "Casa no indicada")} · ${escapeHtml(family)} · Alternativa parcial</small></span>
            <span class="match-score">${item.score}%</span>
          </div>
          ${reasons}
          <div class="evidence-inline">Cobertura del perfil: ${item.coverage}% · revisa los criterios que faltan antes de elegir</div>
        </button>`;
    }).join("");
    target.innerHTML = `
      <div class="warning-panel"><strong>${alternatives ? "No hay coincidencias completas; encontré alternativas parciales." : "No hay una recomendación suficientemente sustentada."}</strong>
        La biblioteca contiene datos incompletos para uno o más filtros. ${missing.length ? "Campos que faltan en la opción mejor posicionada: " + escapeHtml(missing.join(", ")) + "." : "Ninguna opción superó el umbral mínimo de cobertura."}
        Las alternativas parciales no se presentan como coincidencias completas.
      </div>
      ${alternatives ? `<div class="result-section-title"><strong>Alternativas para revisar</strong><small>${result.alternatives.length} opciones parciales</small></div>${alternatives}` : ""}
      <div class="result-disclaimer">El motor no rellenó valores desconocidos ni inventó duración, proyección o intensidad. Las preferencias que exigen límites obligatorios siguen siendo restricciones estrictas.</div>`;
    return;
  }
  const items = result.recommendations.map((item, index) => {
    const product = state.products.find(candidate => candidate.id === item.id);
    const family = product?.attributes?.primaryScentFamily ?? product?.attributes?.scentFamilies?.[0] ?? "Familia no indicada";
    const notes = product?.attributes?.allNotes ?? [
      ...(product?.attributes?.topNotes ?? []),
      ...(product?.attributes?.middleNotes ?? []),
      ...(product?.attributes?.baseNotes ?? []),
    ];
    const reasons = item.reasons?.length
      ? `<ul class="advice-reasons">${item.reasons.slice(0, 3).map(reason => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>`
      : "";
    return `
      <button type="button" class="advice-card" data-action="open-fragrance" data-id="${encodeURIComponent(item.id)}">
        <div class="advice-card-head">
          <span class="advice-rank">${String(index + 1).padStart(2, "0")}</span>
          <span class="advice-card-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(product?.brand ?? "Casa no indicada")} · ${escapeHtml(family)}</small></span>
          <span class="match-score">${item.score}%</span>
        </div>
        ${reasons}
        <div class="evidence-inline">Cobertura del perfil: ${item.coverage}% · ${notes.length ? escapeHtml(notes.slice(0, 5).join(", ")) : "Pirámide de notas no disponible"}</div>
      </button>
      <div class="advice-feedback">
        <span>¿Qué te pareció?</span>
        <button type="button" data-action="rate-fragrance" data-id="${encodeURIComponent(item.id)}" data-rating="5">Me gusta</button>
        <button type="button" data-action="rate-fragrance" data-id="${encodeURIComponent(item.id)}" data-rating="1">No es para mí</button>
      </div>`;
  }).join("");
  const recognized = Object.entries(result.preferences ?? {}).flatMap(([key, value]) => {
    const values = Array.isArray(value) ? value : [value];
    return values.map(item => `${key}: ${item}`);
  });
  target.innerHTML = `
    <div class="result-section-title"><strong>Opciones que encajan con tu perfil</strong><small>${result.recommendations.length} sugerencias</small></div>
    ${items}
    <div class="preference-chips">${recognized.map(value => `<span class="preference-chip">${escapeHtml(value)}</span>`).join("")}</div>
    <div class="result-disclaimer">Compatibilidad con tus preferencias, no una calificación universal. Las coincidencias utilizan atributos del catálogo sin verificación independiente; no son una garantía de olor, duración, proyección ni rendimiento.</div>`;
}

function renderFragranceSearch() {
  return `
    <section class="search-panel"><label for="fragrance-search">BUSCAR EN LA BIBLIOTECA OFFLINE</label>
      <div class="search-field"><span>⌕</span><input id="fragrance-search" type="search" autocomplete="off" placeholder="Perfume, marca, familia o nota..." value="${escapeHtml(state.searchQuery)}"><button type="button" id="clear-search" data-action="clear-search" aria-label="Limpiar búsqueda">×</button></div>
    </section>
    <section id="fragrance-results" class="results-list"></section>
    <p class="footnote">Fuente: Scento Perfume Database, snapshot 29-10-2026, licencia CC BY 4.0. Sus afirmaciones permanecen como reportadas hasta una comprobación independiente.</p>`;
}

const COLLECTION_STATUS_LABELS = Object.freeze({
  wishlist: "Por probar",
  owned: "Lo tengo",
  sampled: "Ya lo probé",
});

function renderManagedFragranceCard(product, {
  collectionItem = null,
  favorite = false,
  comparisonSelected = false,
} = {}) {
  const status = collectionItem ? COLLECTION_STATUS_LABELS[collectionItem.status] : null;
  const family = product.attributes.primaryScentFamily ?? product.attributes.scentFamilies?.[0] ?? "Familia no indicada";
  const productId = encodeURIComponent(product.id);
  const noteEditorOpen = state.editingCollectionNoteId === product.id && Boolean(collectionItem);
  const note = collectionItem?.note ?? "";
  return `
    <article class="collection-card">
      <button type="button" class="collection-open" data-action="open-fragrance" data-id="${productId}">
        <span class="result-monogram">F</span>
        <span class="result-copy"><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.brand ?? "Casa no indicada")}</small><em>${escapeHtml(family)}</em></span>
        <span class="result-arrow">↗</span>
      </button>
      ${collectionItem ? `<div class="collection-status"><span>Estado</span><strong>${escapeHtml(status)}</strong></div>` : ""}
      ${collectionItem ? `
        <div class="collection-note">
          <div><strong>Nota privada</strong><p>${note ? escapeHtml(note) : "Todavía no has escrito una nota para esta fragancia."}</p></div>
          ${noteEditorOpen ? `
            <form id="collection-note-form" data-product-id="${productId}">
              <label for="collection-note-editor">TU NOTA (MÁXIMO 240 CARACTERES)</label>
              <textarea id="collection-note-editor" name="note" maxlength="240" rows="3" placeholder="Ej.: Me gustó para noches frescas; revisar duración...">${escapeHtml(note)}</textarea>
              <small><span id="collection-note-count">${note.length}</span>/240 caracteres · Solo se guarda en este perfil local</small>
              <div class="collection-note-actions">
                <button type="submit">Guardar nota</button>
                <button type="button" data-action="cancel-collection-note" data-id="${productId}">Cancelar</button>
              </div>
            </form>` : `<button type="button" data-action="edit-collection-note" data-id="${productId}">${note ? "Editar nota" : "Añadir nota"}</button>`}
        </div>` : ""}
      <div class="collection-card-actions">
        <button type="button" data-action="toggle-favorite" data-id="${productId}"
          data-favorite="${favorite ? "false" : "true"}">${favorite ? "★ Favorito" : "☆ Favorito"}</button>
        <button type="button" data-action="toggle-collection-compare" data-id="${productId}">${comparisonSelected ? "Quitar de comparación" : "Comparar"}</button>
        ${collectionItem ? `
          <button type="button" data-action="collection-status" data-id="${productId}" data-status="wishlist">Por probar</button>
          <button type="button" data-action="collection-status" data-id="${productId}" data-status="owned">Lo tengo</button>
          <button type="button" data-action="collection-status" data-id="${productId}" data-status="sampled">Lo probé</button>
          <button type="button" class="collection-remove" data-action="remove-collection" data-id="${productId}">Quitar</button>` : `
          <button type="button" data-action="collection-status" data-id="${productId}" data-status="wishlist">Añadir a colección</button>`}
      </div>
    </article>`;
}

function renderFragranceCollectionContent(profile) {
  const productMap = new Map(state.products.map(product => [product.id, product]));
  const { favorites: visibleFavorites, collection: visibleCollection } = filterFragranceCollection({
    products: state.products,
    collection: profile?.collection ?? [],
    favorites: profile?.favorites ?? [],
    query: state.collectionSearch,
    status: state.collectionFilter,
  });
  const favoritesCount = (profile?.favorites ?? []).length;
  const collectionCount = (profile?.collection ?? []).length;
  const selectedIds = new Set(state.comparisonSelection);
  const selectedCount = state.comparisonSelection.filter(id => productMap.has(id)).length;
  const showFavorites = state.collectionFilter === "all" || state.collectionFilter === "favorites";
  const showCollection = state.collectionFilter !== "favorites";

  return `
    <section class="collection-compare-tools">
      <div><strong>Comparación rápida</strong><p>Marca entre dos y cuatro perfumes de tus listas para compararlos lado a lado.</p></div>
      <button type="button" data-action="open-collection-comparison" ${selectedCount < 2 ? "disabled" : ""}>
        Comparar selección · ${selectedCount}/4
      </button>
    </section>
    ${showFavorites ? `
      <section class="collection-section">
        <div class="result-section-title"><strong>Mis favoritos</strong><small>${visibleFavorites.length} / ${favoritesCount}</small></div>
        ${visibleFavorites.length
          ? `<div class="collection-list">${visibleFavorites.map(product => renderManagedFragranceCard(product, {
            favorite: true,
            comparisonSelected: selectedIds.has(product.id),
            // Keep note editing in the collection section only to avoid duplicate form IDs.
            collectionItem: null,
          })).join("")}</div>`
          : `<div class="empty-panel compact"><strong>${favoritesCount ? "No hay favoritos que coincidan" : "Todavía no tienes favoritos"}</strong><p>${favoritesCount ? "Prueba con otro nombre, casa o familia." : "Abre una ficha y marca la estrella para guardar tus perfumes preferidos."}</p></div>`}
      </section>` : ""}
    ${showCollection ? `
      <section class="collection-section">
        <div class="result-section-title"><strong>${state.collectionFilter === "all" ? "Mi colección" : "Resultados filtrados"}</strong><small>${visibleCollection.length} / ${collectionCount}</small></div>
        ${visibleCollection.length
          ? `<div class="collection-list">${visibleCollection.map(entry => renderManagedFragranceCard(entry.product, {
            collectionItem: entry.item,
            favorite: (profile?.favorites ?? []).includes(entry.product.id),
            comparisonSelected: selectedIds.has(entry.product.id),
          })).join("")}</div>`
          : `<div class="empty-panel compact"><strong>${collectionCount ? "No hay perfumes en este filtro" : "Tu colección está vacía"}</strong><p>${collectionCount ? "Cambia el estado o la búsqueda para ver otros perfumes." : "Desde cualquier ficha puedes añadir un perfume como “Por probar”, “Lo tengo” o “Ya lo probé”."}</p></div>`}
      </section>` : ""}
    ${state.comparisonSelection.length >= 4 ? '<p class="field-hint">Has alcanzado el máximo de cuatro perfumes para comparar. Quita uno para seleccionar otro.</p>' : ""}`;
}

function renderFragranceCollection() {
  const profile = state.profile ?? state.runtime.knowledgeStore.getFragranceProfile();
  const collection = profile?.collection ?? [];
  const wishlistCount = collection.filter(item => item.status === "wishlist").length;
  const ownedCount = collection.filter(item => item.status === "owned").length;
  const sampledCount = collection.filter(item => item.status === "sampled").length;
  return `
    <section class="collection-summary">
      <span class="kicker">TU BIBLIOTECA PERSONAL</span>
      <h2>Tu colección, a tu manera.</h2>
      <p>Guarda perfumes que quieres probar, que ya tienes o que ya conoces. Los favoritos son independientes del estado de colección. Puedes anotar impresiones privadas y comparar tus selecciones.</p>
      <div class="collection-stats">
        <div><strong>${collection.length}</strong><small>En colección</small></div>
        <div><strong>${wishlistCount}</strong><small>Por probar</small></div>
        <div><strong>${ownedCount}</strong><small>En posesión</small></div>
        <div><strong>${sampledCount}</strong><small>Probados</small></div>
      </div>
    </section>
    <section class="collection-tools">
      <label for="collection-search">BUSCAR EN TUS LISTAS</label>
      <input id="collection-search" type="search" autocomplete="off" placeholder="Perfume, casa o familia..." value="${escapeHtml(state.collectionSearch)}">
      <label for="collection-filter">FILTRAR LISTA</label>
      <select id="collection-filter">
        <option value="all" ${state.collectionFilter === "all" ? "selected" : ""}>Toda mi colección y favoritos</option>
        <option value="wishlist" ${state.collectionFilter === "wishlist" ? "selected" : ""}>Por probar</option>
        <option value="owned" ${state.collectionFilter === "owned" ? "selected" : ""}>Lo tengo</option>
        <option value="sampled" ${state.collectionFilter === "sampled" ? "selected" : ""}>Ya lo probé</option>
        <option value="favorites" ${state.collectionFilter === "favorites" ? "selected" : ""}>Solo favoritos</option>
      </select>
      <p class="field-hint">Los filtros no modifican ni eliminan tus registros.</p>
    </section>
    <div id="collection-content">${renderFragranceCollectionContent(profile)}</div>`;
}

function renderComparisonValue(value) {
  if (value === null || value === undefined) return `<span class="comparison-missing">Sin dato registrado</span>`;
  if (Array.isArray(value)) return escapeHtml(value.join(" · "));
  if (typeof value === "object" && Number.isFinite(value.min) && Number.isFinite(value.max)) {
    return escapeHtml(`${value.min}–${value.max} ${value.unit}`);
  }
  if (typeof value === "object" && Number.isFinite(value.value)) {
    return escapeHtml(`${value.value} ${value.unit}`);
  }
  return escapeHtml(value);
}

function renderFragranceComparisonMatrix(result) {
  if (!result) return "";
  const header = result.columns.map(product => `
    <th><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.brand ?? "Casa no indicada")}</small></th>`).join("");
  const rows = result.fields.map(field => `
    <tr><th scope="row">${escapeHtml(field.label)}<small>${field.available}/${field.total} con dato</small></th>
      ${field.values.map(item => `<td>${renderComparisonValue(item.available ? item.value : null)}</td>`).join("")}
    </tr>`).join("");
  const coverage = result.coverage.map(item => {
    const product = result.columns.find(column => column.id === item.productId);
    return `<div><span>${escapeHtml(product?.name ?? item.productId)}</span><strong>${item.percent}%</strong><small>${item.availableFields}/${item.totalFields} campos disponibles</small></div>`;
  }).join("");
  return `
    <section class="fragrance-comparison-result">
      <div class="result-section-title"><strong>Comparación de atributos</strong><small>Descriptiva · sin ganador automático</small></div>
      <div class="fragrance-comparison-scroll"><table class="fragrance-comparison-table">
        <thead><tr><th scope="col">Atributo</th>${header}</tr></thead><tbody>${rows}</tbody>
      </table></div>
      <div class="comparison-coverage-grid">${coverage}</div>
      <div class="result-disclaimer">${result.caveats.map(item => `<p>${escapeHtml(item)}</p>`).join("")}</div>
    </section>`;
}

function renderComparisonSelection() {
  const target = document.querySelector("#fragrance-compare-selected");
  if (!target) return;
  const selected = state.comparisonSelection
    .map(id => state.products.find(product => product.id === id))
    .filter(Boolean);
  target.innerHTML = `
    <div class="comparison-selected-head"><strong>Seleccionados</strong><small>${selected.length}/4 · mínimo 2</small></div>
    <div class="comparison-selected-list">${selected.map(product => `
      <span>${escapeHtml(product.name)}
        <button type="button" data-action="remove-comparison" data-id="${encodeURIComponent(product.id)}" aria-label="Quitar ${escapeHtml(product.name)}">×</button>
      </span>`).join("") || `<small>Aún no has seleccionado perfumes.</small>`}</div>
    <div class="comparison-selector-actions">
      <button type="button" data-action="run-fragrance-comparison" ${selected.length < 2 ? "disabled" : ""}>Comparar selección</button>
      <button type="button" data-action="clear-comparison" ${selected.length ? "" : "disabled"}>Limpiar</button>
    </div>`;
}

function renderComparisonSearchResults() {
  const target = document.querySelector("#fragrance-compare-results");
  if (!target) return;
  const query = state.comparisonSearch.trim();
  if (!query) {
    target.innerHTML = `<div class="empty-panel compact"><strong>Busca perfumes para comparar</strong><p>Selecciona entre dos y cuatro fichas de la biblioteca local.</p></div>`;
    return;
  }
  const matches = searchProducts(state.products, query, 15);
  target.innerHTML = matches.length ? matches.map(product => {
    const selected = state.comparisonSelection.includes(product.id);
    const disabled = !selected && state.comparisonSelection.length >= 4;
    return `
      <label class="comparison-option ${selected ? "selected" : ""}">
        <input type="checkbox" name="fragrance-compare-product" value="${escapeHtml(product.id)}"
          ${selected ? "checked" : ""} ${disabled ? "disabled" : ""}>
        <span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.brand ?? "Casa no indicada")}</small></span>
        <em>${selected ? "Seleccionado" : "Añadir"}</em>
      </label>`;
  }).join("") : `<div class="empty-panel compact"><strong>No encontramos coincidencias</strong><p>Prueba con el nombre del perfume o su casa.</p></div>`;
}

function renderFragranceComparison() {
  return `
    <section class="collection-summary">
      <span class="kicker">ANÁLISIS LADO A LADO</span>
      <h2>Compara tus fragancias.</h2>
      <p>Selecciona de dos a cuatro perfumes. La matriz muestra datos registrados y señala lo que falta; no convierte campos vacíos en afirmaciones ni crea un ganador universal.</p>
    </section>
    <section class="comparison-selector">
      <label for="fragrance-compare-search">BUSCAR EN LA BIBLIOTECA OFFLINE</label>
      <input id="fragrance-compare-search" type="search" autocomplete="off"
        placeholder="Nombre o casa del perfume..." value="${escapeHtml(state.comparisonSearch)}">
      <div id="fragrance-compare-results" class="comparison-options"></div>
      <div id="fragrance-compare-selected"></div>
    </section>
    <div id="fragrance-comparison-output">${renderFragranceComparisonMatrix(state.comparisonResult)}</div>`;
}

function renderFragrance() {
  return `
    <section class="page-intro fragrance-intro"><span class="kicker">MÓDULO 01 / FRAGRANCE</span>
      <h1>Tu perfil.<br><span>Tu fragancia.</span></h1>
      <p>Personaliza la búsqueda según tu ocasión, familia olfativa, notas, clima e intensidad preferida.</p>
      <div class="catalog-chip"><i></i> ${state.runtime.fragranceCount.toLocaleString("es-NI")} fichas locales · funciona sin conexión</div>
    </section>
    ${renderModeTabs()}
    ${state.fragranceMode === "advisor" ? renderFragranceAdvisorForm()
      : state.fragranceMode === "search" ? renderFragranceSearch()
        : state.fragranceMode === "collection" ? renderFragranceCollection()
          : renderFragranceComparison()}
  `;
}

function renderFragranceDetail(product) {
  const attributes = product.attributes ?? {};
  const profile = state.profile ?? state.runtime.knowledgeStore.getFragranceProfile();
  const favorite = (profile?.favorites ?? []).includes(product.id);
  const collectionItem = (profile?.collection ?? []).find(item => item.productId === product.id);
  const collectionStatus = collectionItem ? COLLECTION_STATUS_LABELS[collectionItem.status] : "No está en tu colección";
  return `
    <section class="detail-top"><button type="button" class="back-link" data-action="back-to-fragrance">← Volver a fragancias</button>
      <span class="kicker">FICHA DE FRAGANCIA</span><div class="detail-monogram">F</div>
      <h1>${escapeHtml(product.name)}</h1><p class="detail-brand">${escapeHtml(product.brand)}</p>
      <div class="tag-row"><span>${escapeHtml(formatFragranceConcentration(attributes.concentrationLabel))}</span><span>${escapeHtml(attributes.releaseYear ?? "Año no indicado")}</span></div>
      <div class="detail-actions">
        <div><span>Tu estado</span><strong>${escapeHtml(collectionStatus)}</strong></div>
        <button type="button" data-action="toggle-favorite" data-id="${encodeURIComponent(product.id)}"
          data-favorite="${favorite ? "false" : "true"}">${favorite ? "★ Quitar de favoritos" : "☆ Agregar a favoritos"}</button>
        <div class="detail-collection-actions">
          <button type="button" data-action="collection-status" data-id="${encodeURIComponent(product.id)}" data-status="wishlist">Por probar</button>
          <button type="button" data-action="collection-status" data-id="${encodeURIComponent(product.id)}" data-status="owned">Lo tengo</button>
          <button type="button" data-action="collection-status" data-id="${encodeURIComponent(product.id)}" data-status="sampled">Ya lo probé</button>
          ${collectionItem ? `<button type="button" data-action="remove-collection" data-id="${encodeURIComponent(product.id)}">Quitar de colección</button>` : ""}
        </div>
      </div>
    </section>
    <section class="detail-block"><span class="kicker">PERFIL OLFATIVO</span><h2>Familias y carácter</h2>
      <p>${displayList(attributes.scentFamilies, "family")}</p>
      <div class="note-grid">
        <div><small>SALIDA</small><strong>${displayList(attributes.topNotes, "note")}</strong></div>
        <div><small>CORAZÓN</small><strong>${displayList(attributes.middleNotes, "note")}</strong></div>
        <div><small>FONDO</small><strong>${displayList(attributes.baseNotes, "note")}</strong></div>
      </div>
    </section>
    <section class="detail-block"><span class="kicker">DETALLES DISPONIBLES</span><h2>Información de la ficha</h2>
      <dl class="fact-list">
        <div><dt>Perfumista</dt><dd>${displayList(attributes.perfumers)}</dd></div>
        <div><dt>Temporadas</dt><dd>${displayList(attributes.seasons, "season")}</dd></div>
        <div><dt>Momentos del día</dt><dd>${displayList(attributes.timesOfDay, "time")}</dd></div>
        <div><dt>Año de lanzamiento</dt><dd>${escapeHtml(attributes.releaseYear ?? "Sin dato")}</dd></div>
      </dl>
    </section>
    <aside class="evidence-note"><strong>Nota de evidencia</strong>
      <p>La información procede de la fuente identificada en el dataset. No demuestra por sí sola duración, proyección, rendimiento ni autenticidad. No mostramos horas de duración sin evidencia elegible.</p>
      <a href="${escapeHtml(safeExternalUrl(attributes.sourceUrl, "https://www.scento.com/perfume-database"))}" target="_blank" rel="noopener noreferrer">Consultar fuente ↗</a>
    </aside>`;
}

function renderTechSource(source) {
  const stateText = {
    found: "Datos encontrados",
    partial: "Datos parciales",
    not_found: "Sin coincidencias",
    error: "Fuente no disponible",
    blocked: "Acceso automático no permitido",
  }[source.status] ?? source.status;
  const facts = source.facts.length
    ? `<dl class="tech-fact-list">${source.facts.map(fact => {
      const formattedCapacity = formatTechnologyFactValue(fact.value, fact.key);
      const value = formattedCapacity ?? renderValue(fact.value);
      return `<div class="tech-fact"><dt>${escapeHtml(fact.label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
    }).join("")}</dl>`
    : `<p class="field-hint">${escapeHtml(source.error ?? "La fuente no devolvió campos para este identificador exacto.")}</p>`;
  const url = safeExternalUrl(source.source?.url);
  const attribution = source.source?.attribution;
  return `
    <section class="tech-result-source">
      <div class="tech-source-head"><strong>${escapeHtml(source.name)}</strong><span class="source-state ${source.status === "found" || source.status === "partial" ? "found" : ""}">${escapeHtml(stateText)}</span></div>
      ${facts}
      ${url ? `<a class="source-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Abrir registro de origen ↗</a>` : ""}
      ${attribution ? `<p class="field-hint">${escapeHtml(attribution)}</p>` : ""}
    </section>`;
}

function renderPrimarySpecSources(models) {
  const unique = [...new Set(models.filter(Boolean))];
  return `<section class="primary-spec-sources">
    <div class="result-section-title"><strong>Fuentes principales de especificaciones</strong><small>Prioridad de consulta</small></div>
    <div class="primary-spec-source-grid">${unique.map(model => `
      <article class="primary-spec-source-model">
        <strong>${escapeHtml(model)}</strong>
        <div class="primary-spec-source-links">${buildPrimarySpecSourceLinks(model).map(source => {
          const url = safeExternalUrl(source.url);
          return url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.name)} <span>↗</span></a>` : "";
        }).join("")}</div>
      </article>`).join("")}
    </div>
    <p class="field-hint">GSMArena y Xataka son las referencias principales. CoreInfo y TechAPI quedan limitadas a identificar el modelo y la marca; no completan la ficha técnica.</p>
  </section>`;
}

function renderTechResults() {
  const result = state.techLookupResult;
  if (!result) return "";
  if (result.error) return `<section class="tech-results"><div class="comparison-incomplete"><strong>No se pudo consultar esta ficha.</strong><p>${escapeHtml(result.error)}</p></div></section>`;
  const found = result.sources.some(source => source.status === "found" || source.status === "partial");
  const currentLookup = state.techModel.trim() === result.model && state.techResource === result.resource;
  return `
    <section class="tech-results">
      <div class="result-section-title"><strong>${escapeHtml(result.model)}</strong><small>Slug: ${escapeHtml(result.slug)}</small></div>
      ${renderPrimarySpecSources([result.model])}
      ${result.sources.map(renderTechSource).join("")}
      <div class="result-disclaimer">${found ? "Estos datos son candidatos recuperados de fuentes públicas. No están verificados independientemente." : "No se obtuvo una ficha coincidente con este slug. Confirma el nombre/identificador e inténtalo con la categoría correcta."} La búsqueda es exacta y no descarga catálogos completos.</div>
      ${found && state.techSavedProductId === result.slug
        ? '<div class="save-confirmation">Guardado en la biblioteca como información reportada. No está verificada.</div>'
        : found && currentLookup ? `<button type="button" class="primary-action tech-action save-candidate-button" data-action="save-tech-candidate" ${state.techSaveStatus === "saving" ? "disabled" : ""}>${state.techSaveStatus === "saving" ? "Guardando candidato..." : "Guardar como dato reportado"}</button>` : ""}
      ${state.techSaveMessage ? `<div class="${state.techSaveStatus === "error" ? "warning-panel" : "field-hint"}">${escapeHtml(state.techSaveMessage)}</div>` : ""}
      ${found && currentLookup ? '<p class="field-hint">Al guardar, JBAE conserva la procedencia por campo y mantiene el estado «reportado». No se sobrescriben fichas existentes.</p>' : ""}
    </section>`;
}


function renderTechnologySuggestionButton(item, slot = null) {
  const action = slot === null ? "select-tech-lookup-model" : "select-tech-compare-model";
  const index = slot === null ? "" : ` data-index="${slot}"`;
  return `<button type="button" class="technology-suggestion" role="option" data-action="${action}"${index}
    data-name="${escapeHtml(item.name)}" data-slug="${escapeHtml(item.slug)}"
    data-resource="${escapeHtml(item.resource)}">
    <span class="technology-suggestion-copy"><strong>${escapeHtml(item.name)}</strong><small>CoreInfo · modelo disponible</small></span>
    <span class="technology-suggestion-arrow">↗</span>
  </button>`;
}

async function updateTechnologySuggestions(query, { resource, panel, index = null } = {}) {
  if (!panel) return;
  const isSingle = index === null;
  const token = isSingle
    ? ++state.techLookupSuggestionToken
    : ++state.techCompareSuggestionTokens[index];
  const normalized = query.trim();
  panel.innerHTML = "";
  const input = isSingle
    ? document.querySelector("#tech-model")
    : document.querySelector("#tech-compare-model-" + (index + 1));
  if (normalized.length < 2) {
    input?.setAttribute("aria-expanded", "false");
    return;
  }
  panel.innerHTML = '<div class="technology-suggestion-status">Buscando coincidencias...</div>';
  try {
    const matches = await searchTechnologyCatalog(normalized, { resource, limit: 8 });
    const current = isSingle
      ? token === state.techLookupSuggestionToken
      : token === state.techCompareSuggestionTokens[index];
    if (!current || !panel.isConnected) return;
    if (matches.length) {
      panel.innerHTML = matches.map(item => renderTechnologySuggestionButton(item, index)).join("");
      input?.setAttribute("aria-expanded", "true");
    } else {
      panel.innerHTML = '<div class="technology-suggestion-status">No encontramos ese modelo en el catálogo. Probá con el nombre de la serie o la marca.</div>';
      input?.setAttribute("aria-expanded", "false");
    }
  } catch (error) {
    const current = isSingle
      ? token === state.techLookupSuggestionToken
      : token === state.techCompareSuggestionTokens[index];
    if (!current || !panel.isConnected) return;
    panel.innerHTML = `<div class="technology-suggestion-status">No se pudo cargar el catálogo. ${escapeHtml(error instanceof Error ? error.message : "Revisá la conexión e intentá de nuevo.")}</div>`;
    input?.setAttribute("aria-expanded", "false");
  }
}

function renderTechComparisonForm() {
  const profileOptions=TECHNOLOGY_COMPARISON_PROFILES.map(profile=>
    `<option value="${profile.value}" ${state.techCompareMetric===profile.value?"selected":""}>${escapeHtml(profile.label)}</option>`);
  const metricOptions=TECHNOLOGY_COMPARISON_METRICS.map(metric=>
    `<option value="${metric.value}" ${state.techCompareMetric===metric.value?"selected":""}>${escapeHtml(metric.label)}</option>`);
  const inputs=state.techCompareModels.map((model,i)=>`<div class="field-group tech-device-field">
    <label for="tech-compare-model-${i+1}">DISPOSITIVO ${i+1}${i<2?' <span class="required-marker" aria-label="requerido">*</span>':""}</label>
    <input id="tech-compare-model-${i+1}" autocomplete="off" autocapitalize="off" spellcheck="false"
      maxlength="120" role="combobox" aria-autocomplete="list" aria-expanded="false"
      aria-controls="tech-compare-suggestions-${i}" value="${escapeHtml(model)}" ${i<2?"required":""}
      ${state.techComparisonStatus === "loading" ? "disabled" : ""}>
    <div id="tech-compare-suggestions-${i}" class="technology-suggestions" role="listbox" aria-label="Modelos coincidentes"></div>
  </div>`).join("");
  const generalSelected=state.techCompareMetric==="general";
  return `<form id="tech-compare-form" class="tech-compare-form">
    <div class="form-heading"><strong>Comparar de 2 a 4 dispositivos</strong><p>Escribí el modelo y elegilo de la lista. JBAE consulta cada registro en las fuentes disponibles.</p></div>
    <div class="field-group"><label for="tech-resource">CATEGORÍA</label><select id="tech-resource" ${state.techComparisonStatus === "loading" ? "disabled" : ""}>
      <option value="smartphones" ${state.techResource==="smartphones"?"selected":""}>Celulares</option><option value="tablets" ${state.techResource==="tablets"?"selected":""}>Tablets</option><option value="laptops" ${state.techResource==="laptops"?"selected":""}>Laptops</option><option value="watches" ${state.techResource==="watches"?"selected":""}>Smartwatches</option><option value="monitors" ${state.techResource==="monitors"?"selected":""}>Monitores</option>
    </select></div>
    <div class="tech-compare-inputs">${inputs}</div>
    <div class="field-group"><label for="tech-compare-metric">PERFIL DE ANÁLISIS</label><select id="tech-compare-metric" ${state.techComparisonStatus === "loading" ? "disabled" : ""}>
      ${profileOptions.join("")}<optgroup label="Análisis por característica">${metricOptions.join("")}</optgroup>
    </select><span class="field-hint">${generalSelected
      ?"Uso general pondera memoria, almacenamiento, batería, cámara y portabilidad. El procesador y la GPU se muestran, pero solo se puntúan con pruebas comparables."
      :"El análisis individual compara solo la característica seleccionada."}</span></div>
    <button class="primary-action tech-action" type="submit" ${state.techComparisonStatus==="loading"?"disabled":""}>${state.techComparisonStatus==="loading"?"Consultando dispositivos...":"Comparar dispositivos"} <span>↗</span></button>
  </form>
  ${state.techComparisonStatus==="loading"?'<div class="loading-inline">Consultando fuentes para cada dispositivo...</div>':renderTechComparisonResults()}`;
}

function renderTechComparisonResults() {
  const result=state.techComparisonResult;
  if(!result)return "";
  if(result.error){
    const gate=result.qualityGate;
    const coverage=gate?.devices?.map(device=>`<li><span>${escapeHtml(device.name)}</span><b>${device.availableDimensionCount}/3</b><small>${escapeHtml(device.sourceCoverage?.map(source=>source.name+": "+source.status).join(" · ")||"Sin cobertura de fuente")}</small></li>`).join("")??"";
    return `<div class="comparison-incomplete">
      <strong>No hay datos suficientes para comparar estos modelos.</strong>
      <p>${escapeHtml(result.error)}</p>
      ${gate? `<div class="comparison-coverage"><span>Cobertura común</span><b>${gate.coveragePercent??0}%</b></div>${coverage? `<ul>${coverage}</ul>`:""}`:""}
      <p class="field-hint">Revisá los modelos seleccionados o intentá más tarde si una fuente no está disponible. JBAE no va a inventar especificaciones ni declarar un ganador con una ficha incompleta.</p>
    </div>`;
  }
  if(!Array.isArray(result.products)||!Array.isArray(result.rows)) {
    return '<div class="comparison-incomplete"><strong>No se recibió una ficha comparable.</strong><p>La consulta no devolvió los datos necesarios.</p></div>';
  }
  const header=result.products.map(p=>`<th><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.brand)}</small></th>`).join("");
  const rows=result.rows.map(row=>`<tr><th scope="row">${escapeHtml(row.label)}</th>${row.values.map(v=>`<td class="${v.conflict?"comparison-conflict":""}">${escapeHtml(v.display)}${v.conflict?'<small class="conflict-label">Conflicto entre fuentes</small>':""}</td>`).join("")}</tr>`).join("");
  const ranking=result.ranking?`<section class="comparison-rank"><strong>${result.profile?"Puntuación de uso general (equilibrado)":"Puntuación relativa · "+escapeHtml(result.metric.label)}</strong>
    <ol>${result.ranking.ranking.map(x=>`<li><span>${escapeHtml(x.name)}</span><b>${x.score===null?"Sin datos":x.score+"/100"}</b></li>`).join("")}</ol>
    <small>${result.profile?"Índice comparativo entre estos modelos. Cobertura del perfil: "+result.profile.coveragePercent+"% ("+result.profile.availableDimensionCount+" dimensiones comunes).":"El puntaje compara únicamente el criterio elegido."}</small></section>`:"";
  let profileDetails="";
  if(result.profile){
    const devices=result.profile.scores.map(device=>`<article class="profile-device"><strong>${escapeHtml(device.name)}</strong><div class="profile-dimensions">${device.dimensions.map(d=>`<div><span>${escapeHtml(d.label)} <small>${d.weightPercent}%</small></span><b>${d.score===null?"N/D":d.score+"/100"}</b></div>`).join("")}</div></article>`).join("");
    const excluded=result.profile.excludedDimensions.length?`<p class="field-hint">No incluidas por falta de datos comunes: ${result.profile.excludedDimensions.map(x=>escapeHtml(x.label)).join(", ")}.</p>`:"";
    profileDetails=`<section class="comparison-rank"><strong>Desglose del equilibrio</strong>${devices}${excluded}<ul>${result.profile.notes.map(note=>`<li>${escapeHtml(note)}</li>`).join("")}</ul></section>`;
  }
  const identity=result.identityPairs.map(x=>`<li><span>${escapeHtml(x.left)} ↔ ${escapeHtml(x.right)}</span><b>${escapeHtml(x.matchType.replaceAll("_"," "))}</b>${x.variantConflicts?.length?`<small>Variantes distintas: ${escapeHtml(x.variantConflicts.join(", "))}</small>`:""}</li>`).join("");
  const sources=result.products.map(p=>`<div class="comparison-source-card"><strong>${escapeHtml(p.name)}</strong>${p.sources.map(s=>{const url=safeExternalUrl(s.url);return `<span>${escapeHtml(s.name)} · ${escapeHtml(s.status)}</span>${url?`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Fuente ↗</a>`:""}`;}).join("")}</div>`).join("");
  return `<section class="tech-comparison-results"><div class="result-section-title"><strong>Comparación técnica</strong><small>${result.products.length} equipos</small></div>
    ${renderPrimarySpecSources(result.products.map(product => product.name))}
    <div class="comparison-table-wrap"><table class="tech-comparison-table"><thead><tr><th>Especificación</th>${header}</tr></thead><tbody>${rows}</tbody></table></div>
    ${ranking}${profileDetails}
    <section class="comparison-rank"><strong>Identidad y variantes</strong><ul>${identity}</ul></section>
    <section class="comparison-sources"><strong>Procedencia de los datos</strong>${sources}</section>
    <div class="result-disclaimer">${escapeHtml(result.disclaimer)} Ningún dispositivo fue guardado en la biblioteca.</div></section>`;
}
function renderTech() {
  const tabs=`<div class="mode-tabs" role="tablist" aria-label="Herramientas TECH"><button type="button" class="mode-tab ${state.techMode==="lookup"?"active":""}" data-action="tech-mode" data-mode="lookup" role="tab" aria-selected="${state.techMode==="lookup"}">Buscar ficha</button><button type="button" class="mode-tab ${state.techMode==="compare"?"active":""}" data-action="tech-mode" data-mode="compare" role="tab" aria-selected="${state.techMode==="compare"}">Comparar equipos</button></div>`;
  const lookupForm=`<form id="tech-lookup-form" class="tech-lookup-form"><div class="form-heading"><strong>Buscar una ficha técnica</strong><p>Escribí el modelo y seleccioná una coincidencia del catálogo.</p></div>
    <div class="field-group tech-device-field"><label for="tech-model">MODELO O NOMBRE DEL DISPOSITIVO</label><input id="tech-model" name="model" autocomplete="off" autocapitalize="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="tech-model-suggestions" value="${escapeHtml(state.techModel)}" ${state.techLookupStatus === "loading" ? "disabled" : ""}><div id="tech-model-suggestions" class="technology-suggestions" role="listbox" aria-label="Modelos coincidentes"></div></div>
    <div class="field-group"><label for="tech-resource">CATEGORÍA</label><select id="tech-resource" ${state.techLookupStatus === "loading" ? "disabled" : ""}><option value="smartphones" ${state.techResource==="smartphones"?"selected":""}>Celular / smartphone</option><option value="tablets" ${state.techResource==="tablets"?"selected":""}>Tablet</option><option value="laptops" ${state.techResource==="laptops"?"selected":""}>Laptop</option><option value="watches" ${state.techResource==="watches"?"selected":""}>Smartwatch</option><option value="monitors" ${state.techResource==="monitors"?"selected":""}>Monitor</option></select></div>
    <button class="primary-action tech-action" type="submit" ${state.techLookupStatus==="loading"?"disabled":""}>Consultar especificaciones <span>↗</span></button></form>
    ${state.techLookupStatus==="loading"?'<div class="loading-inline">Consultando fuentes públicas...</div>':renderTechResults()}
    <div class="result-disclaimer">Los resultados son candidatos pendientes de revisión. No se guardan automáticamente.</div>`;
  return `<section class="page-intro tech-intro"><span class="kicker">MÓDULO 02 / TECH</span><h1>Decide con<br><span>criterio técnico.</span></h1><p>Consulta fichas públicas y compara especificaciones con trazabilidad.</p><div class="catalog-chip"><i></i> Consulta online · no requiere cuenta</div></section>${tabs}${state.techMode==="compare"?renderTechComparisonForm():lookupForm}`;
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
      <div class="stat-card"><small>TECNOLOGÍA</small><strong>${technologyCount.toLocaleString("es-NI")}</strong><span>productos guardados</span></div>
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
  return `<section class="error-panel"><span>!</span><h1>No se pudo iniciar la biblioteca</h1><p>${escapeHtml(error?.message ?? "Error de inicialización desconocido")}</p><p>Los datos no se han sustituido por resultados de demostración. Revisa la compilación y la instalación del plugin SQLite.</p></section>`;
}

function updateNavigation() {
  nav.querySelectorAll("[data-route]").forEach(button => {
    button.classList.toggle("active", button.dataset.route === state.route);
  });
}

function render() {
  if (!state.runtime) return;
  updateNavigation();
  if (state.detailsId) {
    const product = state.products.find(item => item.id === state.detailsId);
    app.innerHTML = product ? renderFragranceDetail(product) : renderFragrance();
    return;
  }
  const views = { home: renderHome, fragrance: renderFragrance, tech: renderTech, library: renderLibrary };
  app.innerHTML = (views[state.route] ?? renderHome)();
  if (state.route === "fragrance") {
    if (state.fragranceMode === "search") renderFragranceSearchResults();
    else if (state.fragranceMode === "advisor") renderAdviceResults();
    else if (state.fragranceMode === "compare") {
      renderComparisonSearchResults();
      renderComparisonSelection();
    }
  }
}

function renderFragranceSearchResults() {
  const target = document.querySelector("#fragrance-results");
  if (!target) return;
  const query = state.searchQuery.trim();
  if (!query) {
    target.innerHTML = `<div class="empty-panel"><span class="empty-symbol">⌕</span><strong>Busca una fragancia</strong><p>Escribe un nombre, casa, familia olfativa o nota en el campo superior.</p></div>`;
    return;
  }
  const matches = searchProducts(state.products, query, 30);
  target.innerHTML = matches.length
    ? `<div class="result-summary">${matches.length} resultados · biblioteca offline</div>${matches.map(product => {
      const family = product.attributes.primaryScentFamily ?? product.attributes.scentFamilies?.[0] ?? "Familia no indicada";
      const concentration = product.attributes.concentrationLabel ?? "Concentración no indicada";
      return `<button class="result-card" type="button" data-action="open-fragrance" data-id="${encodeURIComponent(product.id)}">
        <span class="result-monogram">F</span><span class="result-copy"><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.brand)} · ${escapeHtml(concentration)}</small><em>${escapeHtml(family)}</em></span><span class="result-arrow">↗</span>
      </button>`;
    }).join("")}`
    : `<div class="empty-panel compact"><strong>No encontramos coincidencias</strong><p>Revisa la escritura o prueba con otra marca, familia o nota.</p></div>`;
}

function navigate(route) {
  techLookupGuard.invalidate();
  techComparisonGuard.invalidate();
  if (state.techLookupStatus === "loading") state.techLookupStatus = "idle";
  if (state.techComparisonStatus === "loading") state.techComparisonStatus = "idle";
  state.route = route;
  state.detailsId = null;
  state.searchQuery = "";
  state.adviceResult = null;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

nav.addEventListener("click", event => {
  const button = event.target.closest("[data-route]");
  if (button) navigate(button.dataset.route);
});

document.querySelector(".brand").addEventListener("click", event => {
  event.preventDefault();
  navigate("home");
});

app.addEventListener("click", async event => {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) { navigate(routeButton.dataset.route); return; }
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;

  if (actionButton.dataset.action === "select-tech-lookup-model") {
    techLookupGuard.invalidate();
    state.techLookupStatus = "idle";
    const item = { name: actionButton.dataset.name, slug: actionButton.dataset.slug, resource: actionButton.dataset.resource };
    state.techLookupSuggestionToken += 1;
    state.techLookupSelection = item;
    state.techModel = item.name;
    state.techLookupResult = null;
    state.techLookupStatus = "idle";
    state.techSaveStatus = "idle";
    state.techSaveMessage = "";
    document.querySelector("#tech-model").value = item.name;
    document.querySelector("#tech-model-suggestions").innerHTML = "";
    document.querySelector("#tech-model").setAttribute("aria-expanded", "false");
  } else if (actionButton.dataset.action === "select-tech-compare-model") {
    techComparisonGuard.invalidate();
    state.techComparisonStatus = "idle";
    state.techComparisonResult = null;
    const index = Number(actionButton.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index > 3) return;
    const item = { name: actionButton.dataset.name, slug: actionButton.dataset.slug, resource: actionButton.dataset.resource };
    state.techCompareSuggestionTokens[index] += 1;
    state.techCompareSelections[index] = item;
    state.techCompareModels[index] = item.name;
    const input = document.querySelector("#tech-compare-model-" + (index + 1));
    input.value = item.name;
    input.setAttribute("aria-expanded", "false");
    document.querySelector("#tech-compare-suggestions-" + index).innerHTML = "";
  } else if (actionButton.dataset.action === "save-tech-candidate") {
    if (state.techSaveStatus === "saving" || !state.techLookupResult) return;
    state.techSaveStatus = "saving";
    state.techSaveMessage = "";
    render();
    try {
      const candidate = buildTechnologyApprovalCandidate({
        lookup: state.techLookupResult,
        resource: state.techLookupResult.resource,
      });
      const result = await saveTechnologyCandidate(state.runtime.knowledgeStore, candidate);
      state.techSavedProductId = state.techLookupResult.slug;
      state.techSaveStatus = "saved";
      state.techSaveMessage = "Se guardaron " + result.newRecordCount + " evidencias reportadas para " + candidate.product.name + ".";
      state.runtime = {
        ...state.runtime,
        technologyCount: state.runtime.knowledgeStore.getProducts({ domain: DOMAINS.TECHNOLOGY }).length,
        evidenceCount: state.runtime.knowledgeStore.queryEvidence().length,
      };
    } catch (error) {
      state.techSaveStatus = "error";
      state.techSaveMessage = error instanceof Error ? error.message : "No se pudo guardar el candidato.";
    }
    render();
  } else if (actionButton.dataset.action === "tech-mode") {
    techLookupGuard.invalidate();
    techComparisonGuard.invalidate();
    state.techMode = actionButton.dataset.mode;
    state.techLookupStatus = "idle";
    state.techComparisonStatus = "idle";
    state.techComparisonResult = null;
    render();
  } else if (actionButton.dataset.action === "fragrance-mode") {
    state.fragranceMode = actionButton.dataset.mode;
    state.searchQuery = "";
    state.adviceResult = null;
    render();
  } else if (actionButton.dataset.action === "toggle-favorite") {
    const productId = decodeURIComponent(actionButton.dataset.id ?? "");
    const favorite = actionButton.dataset.favorite === "true";
    try {
      await state.runtime.knowledgeStore.setFragranceFavorite({ productId, favorite });
      state.profile = state.runtime.knowledgeStore.getFragranceProfile();
      state.profileMessage = favorite ? "Fragancia guardada en favoritos." : "Fragancia retirada de favoritos.";
    } catch (error) {
      state.profileMessage = error instanceof Error ? error.message : "No se pudo actualizar el favorito.";
    }
    render();
  } else if (actionButton.dataset.action === "collection-status") {
    const productId = decodeURIComponent(actionButton.dataset.id ?? "");
    const status = actionButton.dataset.status;
    try {
      await state.runtime.knowledgeStore.saveFragranceCollectionItem({ productId, status });
      state.profile = state.runtime.knowledgeStore.getFragranceProfile();
      state.profileMessage = "Estado de colección actualizado.";
    } catch (error) {
      state.profileMessage = error instanceof Error ? error.message : "No se pudo guardar en tu colección.";
    }
    render();
  } else if (actionButton.dataset.action === "edit-collection-note") {
    state.editingCollectionNoteId = decodeURIComponent(actionButton.dataset.id ?? "");
    render();
  } else if (actionButton.dataset.action === "cancel-collection-note") {
    state.editingCollectionNoteId = null;
    render();
  } else if (actionButton.dataset.action === "toggle-collection-compare") {
    const productId = decodeURIComponent(actionButton.dataset.id ?? "");
    const selected = !state.comparisonSelection.includes(productId);
    const result = setComparisonSelection(state.comparisonSelection, productId, selected);
    state.comparisonSelection = [...result.selection];
    if (result.reason === "limit_reached") {
      state.profileMessage = "La comparación admite un máximo de cuatro perfumes.";
    }
    state.comparisonResult = null;
    render();
  } else if (actionButton.dataset.action === "open-collection-comparison") {
    if (state.comparisonSelection.length >= 2) {
      state.fragranceMode = "compare";
      state.comparisonSearch = "";
      state.comparisonResult = null;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  } else if (actionButton.dataset.action === "remove-collection") {
    const productId = decodeURIComponent(actionButton.dataset.id ?? "");
    try {
      await state.runtime.knowledgeStore.removeFragranceCollectionItem({ productId });
      state.profile = state.runtime.knowledgeStore.getFragranceProfile();
      state.profileMessage = "Fragancia retirada de tu colección. El favorito se conserva por separado.";
    } catch (error) {
      state.profileMessage = error instanceof Error ? error.message : "No se pudo quitar de la colección.";
    }
    render();
  } else if (actionButton.dataset.action === "remove-comparison") {
    const productId = decodeURIComponent(actionButton.dataset.id ?? "");
    state.comparisonSelection = state.comparisonSelection.filter(id => id !== productId);
    state.comparisonResult = null;
    renderComparisonSelection();
    renderComparisonSearchResults();
    document.querySelector("#fragrance-comparison-output").innerHTML = "";
  } else if (actionButton.dataset.action === "clear-comparison") {
    state.comparisonSelection = [];
    state.comparisonResult = null;
    renderComparisonSelection();
    renderComparisonSearchResults();
    document.querySelector("#fragrance-comparison-output").innerHTML = "";
  } else if (actionButton.dataset.action === "run-fragrance-comparison") {
    const selected = state.comparisonSelection
      .map(id => state.products.find(product => product.id === id))
      .filter(Boolean);
    try {
      state.comparisonResult = buildFragranceComparison({ products: selected });
      document.querySelector("#fragrance-comparison-output").innerHTML =
        renderFragranceComparisonMatrix(state.comparisonResult);
    } catch (error) {
      document.querySelector("#fragrance-comparison-output").innerHTML =
        `<div class="warning-panel"><strong>No se pudo comparar</strong><p>${escapeHtml(error.message)}</p></div>`;
    }
  } else if (actionButton.dataset.action === "open-fragrance") {
    state.detailsId = decodeURIComponent(actionButton.dataset.id);
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (actionButton.dataset.action === "back-to-fragrance") {
    state.detailsId = null;
    state.route = "fragrance";
    render();
  } else if (actionButton.dataset.action === "rate-fragrance") {
    const productId = decodeURIComponent(actionButton.dataset.id ?? "");
    const rating = Number(actionButton.dataset.rating);
    try {
      await state.runtime.knowledgeStore.recordFragranceFeedback({ productId, rating });
      state.profile = state.runtime.knowledgeStore.getFragranceProfile();
      state.profileMessage = rating >= 4
        ? "Valoración guardada. El perfil buscará patrones con tus próximas valoraciones."
        : "Preferencia negativa guardada. Las tendencias se aplicarán cuando haya repetición suficiente.";
      state.adviceResult = buildFragranceAdvice({
        products: state.products,
        message: state.fragrancePrompt,
        ...state.fragranceForm,
        profile: state.profile,
      });
    } catch (error) {
      state.profileMessage = error instanceof Error ? error.message : "No se pudo guardar la valoración.";
    }
    render();
  } else if (actionButton.dataset.action === "clear-search") {
    state.searchQuery = "";
    render();
    document.querySelector("#fragrance-search")?.focus();
  }
});

app.addEventListener("input", event => {
  if (event.target.id === "fragrance-search") {
    state.searchQuery = event.target.value;
    renderFragranceSearchResults();
  } else if (event.target.id === "collection-search") {
    state.collectionSearch = event.target.value;
    const target = document.querySelector("#collection-content");
    if (target) target.innerHTML = renderFragranceCollectionContent(
      state.profile ?? state.runtime.knowledgeStore.getFragranceProfile(),
    );
  } else if (event.target.id === "collection-note-editor") {
    const count = document.querySelector("#collection-note-count");
    if (count) count.textContent = String(event.target.value.length);
  } else if (event.target.id === "fragrance-prompt") {
    state.fragrancePrompt = event.target.value;
  } else if (event.target.id === "fragrance-notes") {
    state.fragranceForm.notes = event.target.value;
  } else if (event.target.id === "fragrance-avoid-notes") {
    state.fragranceForm.avoidNotes = event.target.value;
  } else if (event.target.id === "fragrance-compare-search") {
    state.comparisonSearch = event.target.value;
    renderComparisonSearchResults();
  } else if (event.target.id === "tech-model") {
    techLookupGuard.invalidate();
    state.techLookupStatus = "idle";
    state.techModel = event.target.value;
    state.techLookupSelection = null;
    state.techSaveStatus = "idle";
    state.techSaveMessage = "";
    state.techSavedProductId = null;
    state.techLookupResult = null;
    state.techLookupStatus = "idle";
    document.querySelector(".tech-results")?.remove();
    updateTechnologySuggestions(event.target.value, {
      resource: state.techResource,
      panel: document.querySelector("#tech-model-suggestions"),
    });
  } else if (event.target.id.startsWith("tech-compare-model-")) {
    techComparisonGuard.invalidate();
    state.techComparisonStatus = "idle";
    state.techComparisonResult = null;
    const index = Number(event.target.id.split("-").at(-1)) - 1;
    if (index < 0 || index > 3) return;
    state.techCompareModels[index] = event.target.value;
    state.techCompareSelections[index] = null;
    updateTechnologySuggestions(event.target.value, {
      resource: state.techResource,
      panel: document.querySelector("#tech-compare-suggestions-" + index),
      index,
    });
  }
});

app.addEventListener("change", event => {
  if (event.target.matches('input[name="fragrance-family"]')) {
    state.fragranceForm.families = [...app.querySelectorAll('input[name="fragrance-family"]:checked')]
      .map(input => input.value);
    return;
  }
  if (event.target.matches('input[name="fragrance-avoid-family"]')) {
    state.fragranceForm.avoidFamilies = [...app.querySelectorAll('input[name="fragrance-avoid-family"]:checked')]
      .map(input => input.value);
    return;
  }
  if (event.target.matches('input[name="fragrance-compare-product"]')) {
    const productId = event.target.value;
    const result = setComparisonSelection(state.comparisonSelection, productId, event.target.checked);
    state.comparisonSelection = [...result.selection];
    state.comparisonResult = null;
    renderComparisonSelection();
    renderComparisonSearchResults();
    document.querySelector("#fragrance-comparison-output").innerHTML = "";
    return;
  }
  if (event.target.id === "collection-filter") {
    state.collectionFilter = ["all", "wishlist", "owned", "sampled", "favorites"].includes(event.target.value)
      ? event.target.value : "all";
    const target = document.querySelector("#collection-content");
    if (target) target.innerHTML = renderFragranceCollectionContent(
      state.profile ?? state.runtime.knowledgeStore.getFragranceProfile(),
    );
    return;
  }
  const fields = {
    "fragrance-occasion": "occasion",
    "fragrance-climate": "climate",
    "fragrance-intensity": "intensity",
  };
  const preferenceKey = fields[event.target.id];
  if (preferenceKey) {
    state.fragranceForm[preferenceKey] = event.target.value;
    return;
  }
  if (event.target.id === "tech-resource") {
    techLookupGuard.invalidate();
    techComparisonGuard.invalidate();
    state.techResource = event.target.value;
    state.techModel = "";
    state.techLookupSelection = null;
    state.techLookupResult = null;
    state.techLookupStatus = "idle";
    state.techCompareModels = ["", "", "", ""];
    state.techCompareSelections = [null, null, null, null];
    state.techComparisonResult = null;
    state.techComparisonStatus = "idle";
    state.techSaveStatus = "idle";
    state.techSaveMessage = "";
    state.techSavedProductId = null;
    render();
  }
  if (event.target.id === "tech-compare-metric") {
    techComparisonGuard.invalidate();
    state.techCompareMetric = event.target.value;
    state.techComparisonResult = null;
    state.techComparisonStatus = "idle";
    render();
  }
});

app.addEventListener("submit", async event => {
  event.preventDefault();
  if (event.target.id === "collection-note-form") {
    const productId = decodeURIComponent(event.target.dataset.productId ?? "");
    const note = event.target.querySelector("#collection-note-editor")?.value ?? "";
    const profile = state.runtime.knowledgeStore.getFragranceProfile();
    const existing = profile?.collection.find(item => item.productId === productId);
    if (!existing) {
      state.profileMessage = "La fragancia ya no está en tu colección; vuelve a cargar la lista.";
      state.editingCollectionNoteId = null;
      render();
      return;
    }
    try {
      await state.runtime.knowledgeStore.saveFragranceCollectionItem({
        productId,
        status: existing.status,
        note: note.trim() ? note : null,
      });
      state.profile = state.runtime.knowledgeStore.getFragranceProfile();
      state.profileMessage = note.trim() ? "Nota privada guardada en tu perfil local." : "Nota privada eliminada.";
      state.editingCollectionNoteId = null;
    } catch (error) {
      state.profileMessage = error instanceof Error ? error.message : "No se pudo guardar la nota.";
    }
    render();
    return;
  }

  if (event.target.id === "fragrance-advisor-form") {
    state.fragrancePrompt = document.querySelector("#fragrance-prompt")?.value ?? state.fragrancePrompt;
    state.fragranceForm.families = [...event.target.querySelectorAll('input[name="fragrance-family"]:checked')]
      .map(input => input.value);
    state.fragranceForm.notes = event.target.querySelector("#fragrance-notes")?.value ?? state.fragranceForm.notes;
    state.fragranceForm.avoidNotes = event.target.querySelector("#fragrance-avoid-notes")?.value ?? state.fragranceForm.avoidNotes;
    state.fragranceForm.avoidFamilies = [...event.target.querySelectorAll('input[name="fragrance-avoid-family"]:checked')]
      .map(input => input.value);
    const toList = value => String(value ?? "").split(/[;,]/u).map(item => item.trim()).filter(Boolean);
    try {
      state.profile = await state.runtime.knowledgeStore.saveFragranceProfile({
        id: "local-default",
        preferredFamilies: state.fragranceForm.families,
        avoidFamilies: state.fragranceForm.avoidFamilies,
        preferredNotes: toList(state.fragranceForm.notes),
        avoidNotes: toList(state.fragranceForm.avoidNotes),
        occasion: state.fragranceForm.occasion || null,
        climate: state.fragranceForm.climate || null,
        intensity: state.fragranceForm.intensity || null,
      });
      state.profileMessage = "Preferencias guardadas en tu perfil local.";
      state.adviceResult = buildFragranceAdvice({
        products: state.products,
        message: state.fragrancePrompt,
        ...state.fragranceForm,
        profile: state.profile,
      });
    } catch (error) {
      state.adviceResult = { status: "error", error: error.message };
    }
    render();
    return;
  }

  if (event.target.id === "tech-compare-form") {
    const selectedModels = state.techCompareSelections.filter(Boolean);
    const uniqueSlugs = selectedModels.map(item => item.slug);
    if (selectedModels.length < 2 || new Set(uniqueSlugs).size !== uniqueSlugs.length) {
      state.techComparisonStatus = "complete";
      state.techComparisonResult = { error: "Seleccioná al menos dos modelos de las sugerencias y no repitas dispositivos." };
      render();
      return;
    }
    const resource = state.techResource;
    if (selectedModels.some(item => item.resource !== resource)) {
      state.techComparisonStatus = "complete";
      state.techComparisonResult = { error: "Los modelos seleccionados no pertenecen a la categoría elegida. Volvé a seleccionarlos." };
      render();
      return;
    }
    const metric = document.querySelector("#tech-compare-metric")?.value ?? state.techCompareMetric;
    state.techCompareMetric = metric;
    const requestToken = techComparisonGuard.begin();
    state.techComparisonStatus = "loading";
    state.techComparisonResult = null;
    render();
    try {
      const lookups = await Promise.all(selectedModels.map(item => lookupTechnology({
        model: item.name,
        catalogSlug: item.slug,
        resource,
        fields: TECHNOLOGY_COMPARISON_LOOKUP_FIELDS,
      })));
      const result = buildTechnologyComparison({ lookups, resource, metric });
      if (!techComparisonGuard.isCurrent(requestToken) ||
          state.route !== "tech" || state.techMode !== "compare" || state.techResource !== resource) return;
      state.techComparisonResult = result;
    } catch (error) {
      if (!techComparisonGuard.isCurrent(requestToken) ||
          state.route !== "tech" || state.techMode !== "compare" || state.techResource !== resource) return;
      state.techComparisonResult = {
        error: error instanceof Error ? error.message : "No se pudo completar la comparación.",
      };
    }
    if (!techComparisonGuard.isCurrent(requestToken) ||
        state.route !== "tech" || state.techMode !== "compare" || state.techResource !== resource) return;
    state.techComparisonStatus = "complete";
    render();
    return;
  }

  if (event.target.id === "tech-lookup-form") {
    const selected = state.techLookupSelection;
    if (!selected) {
      state.techLookupStatus = "complete";
      state.techLookupResult = { error: "Escribí el modelo y elegí una coincidencia del catálogo antes de consultar." };
      render();
      return;
    }
    const resource = state.techResource;
    if (selected.resource !== resource) {
      state.techLookupStatus = "complete";
      state.techLookupResult = { error: "El modelo seleccionado no corresponde a la categoría elegida." };
      render();
      return;
    }
    const requestToken = techLookupGuard.begin();
    state.techModel = selected.name;
    state.techLookupStatus = "loading";
    state.techLookupResult = null;
    state.techSaveStatus = "idle";
    state.techSaveMessage = "";
    state.techSavedProductId = null;
    render();
    try {
      const result = await lookupTechnology({
        model: selected.name,
        catalogSlug: selected.slug,
        resource,
      });
      if (!techLookupGuard.isCurrent(requestToken) ||
          state.route !== "tech" || state.techMode !== "lookup" ||
          state.techResource !== resource || state.techModel.trim() !== selected.name) return;
      state.techLookupResult = result;
    } catch (error) {
      if (!techLookupGuard.isCurrent(requestToken) ||
          state.route !== "tech" || state.techMode !== "lookup" ||
          state.techResource !== resource || state.techModel.trim() !== selected.name) return;
      state.techLookupResult = {
        model: selected.name,
        slug: selected.slug,
        resource,
        error: error instanceof Error ? error.message : "No se pudo completar la consulta.",
        sources: [],
      };
    }
    if (!techLookupGuard.isCurrent(requestToken) ||
        state.route !== "tech" || state.techMode !== "lookup" ||
        state.techResource !== resource || state.techModel.trim() !== selected.name) return;
    state.techLookupStatus = "complete";
    render();
    return;
  }
});

function registerPagesServiceWorker() {
  const baseUrl = import.meta.env.BASE_URL;
  if (baseUrl === "/" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register(`${baseUrl}sw.js`, { scope: baseUrl })
    .catch(error => console.warn("No se pudo registrar el service worker de Pages.", error));
}

async function boot() {
  registerPagesServiceWorker();
  try {
    state.runtime = await initializeStorage();
    state.products = state.runtime.knowledgeStore.getProducts({ domain: DOMAINS.FRAGRANCE });
    state.profile = state.runtime.knowledgeStore.getFragranceProfile();
    if (state.profile) {
      state.fragranceForm = {
        occasion: state.profile.occasion ?? "",
        families: [...state.profile.preferredFamilies],
        avoidFamilies: [...state.profile.avoidFamilies],
        notes: state.profile.preferredNotes.join(", "),
        avoidNotes: state.profile.avoidNotes.join(", "),
        climate: state.profile.climate ?? "",
        intensity: state.profile.intensity ?? "",
      };
    }
    runtimeLabel.textContent = state.runtime.native ? "OFFLINE READY" : "PREVIEW MODE";
    runtimeLabel.parentElement.classList.toggle("is-preview", !state.runtime.native);
    render();
    initializeUpdateManager();
  } catch (error) {
    runtimeLabel.textContent = "ERROR";
    runtimeLabel.parentElement.classList.add("is-error");
    app.innerHTML = renderError(error);
  }
}

boot();

window.addEventListener("beforeunload", () => {
  closeStorage().catch(() => undefined);
});
