import test from "node:test";
import assert from "node:assert/strict";
import { EVIDENCE_STATUSES, SOURCE_TYPES } from "../src/core/evidence.js";
import {
  KnowledgeStore,
  MemoryKnowledgeAdapter,
} from "../src/knowledge/knowledge-store.js";
import {
  migrateKnowledgeSnapshot,
  KNOWLEDGE_SCHEMA_VERSION,
} from "../src/knowledge/migrations.js";

const fixedClock = () => new Date("2026-11-07T18:00:00.000Z");
const source = {
  name: "Manufacturer",
  url: "https://example.com/product",
  type: SOURCE_TYPES.OFFICIAL,
};
const evidence = (id, value = "256 GB") => ({
  id,
  domain: "technology",
  subjectId: "phone-001",
  field: "storage",
  value,
  status: EVIDENCE_STATUSES.VERIFIED,
  confidence: 0.95,
  source,
  observedAt: "2026-11-07T17:00:00.000Z",
});

test("opens an empty store and persists its initial versioned snapshot", async () => {
  const adapter = new MemoryKnowledgeAdapter();
  const store = await KnowledgeStore.open({ adapter, clock: fixedClock });
  const persisted = await adapter.readSnapshot();
  assert.equal(store.getSnapshot().schemaVersion, KNOWLEDGE_SCHEMA_VERSION);
  assert.deepEqual(persisted, store.getSnapshot());
  assert.equal(store.getEvidenceStore().size, 0);
});

test("saves evidence through the adapter and reopens without losing it", async () => {
  const adapter = new MemoryKnowledgeAdapter();
  const first = await KnowledgeStore.open({ adapter, clock: fixedClock });
  await first.addEvidence(evidence("ev-001"));
  const reopened = await KnowledgeStore.open({ adapter, clock: fixedClock });
  assert.equal(reopened.queryEvidence({ subjectId: "phone-001" }).length, 1);
  assert.equal(reopened.queryEvidence()[0].value, "256 GB");
});

test("returns detached evidence stores and immutable snapshots", async () => {
  const adapter = new MemoryKnowledgeAdapter();
  const store = await KnowledgeStore.open({ adapter, clock: fixedClock });
  const detached = store.getEvidenceStore();
  detached.add(evidence("local-only"));
  assert.equal(store.getEvidenceStore().size, 0);
  assert.equal(Object.isFrozen(store.getSnapshot()), true);
  assert.equal(Object.isFrozen(store.getSnapshot().metadata), true);
});

test("serializes concurrent writes and retains both records", async () => {
  const adapter = new MemoryKnowledgeAdapter();
  const store = await KnowledgeStore.open({ adapter, clock: fixedClock });
  await Promise.all([
    store.addEvidence(evidence("ev-a", "256 GB")),
    store.addEvidence(evidence("ev-b", "512 GB")),
  ]);
  assert.equal(store.getEvidenceStore().size, 2);
});

test("exports a versioned backup and merges only new evidence", async () => {
  const sourceAdapter = new MemoryKnowledgeAdapter();
  const sourceStore = await KnowledgeStore.open({ adapter: sourceAdapter, clock: fixedClock });
  await sourceStore.addEvidence(evidence("ev-import", "1 TB"));
  const backup = sourceStore.exportBackup();

  const targetAdapter = new MemoryKnowledgeAdapter();
  const targetStore = await KnowledgeStore.open({ adapter: targetAdapter, clock: fixedClock });
  const preview = await targetStore.previewImport(backup);
  assert.equal(preview.canImport, true);
  assert.equal(preview.newRecordCount, 1);

  const result = await targetStore.importBackup(backup);
  assert.equal(result.newRecordCount, 1);
  assert.equal(targetStore.getEvidenceStore().size, 1);
});

test("import is idempotent for identical evidence and rejects ID collisions", async () => {
  const adapter = new MemoryKnowledgeAdapter();
  const store = await KnowledgeStore.open({ adapter, clock: fixedClock });
  await store.addEvidence(evidence("ev-same", "256 GB"));
  const identical = store.exportBackup();
  assert.equal((await store.previewImport(identical)).duplicateRecordCount, 1);
  assert.equal((await store.importBackup(identical)).newRecordCount, 0);

  const collisionAdapter = new MemoryKnowledgeAdapter();
  const other = await KnowledgeStore.open({ adapter: collisionAdapter, clock: fixedClock });
  await other.addEvidence(evidence("ev-same", "512 GB"));
  const collision = await other.previewImport(identical);
  assert.equal(collision.canImport, false);
  assert.deepEqual(collision.conflictingRecordIds, ["ev-same"]);
  await assert.rejects(() => other.importBackup(identical), /ID collisions/);
  assert.equal(other.queryEvidence()[0].value, "512 GB");
});

test("rejects corrupt, unknown and future backup formats without changing state", async () => {
  const adapter = new MemoryKnowledgeAdapter();
  const store = await KnowledgeStore.open({ adapter, clock: fixedClock });
  const before = store.getSnapshot();
  await assert.rejects(() => store.importBackup({ format: "wrong" }), /Unsupported/);
  await assert.rejects(() => store.importBackup({
    format: "jbae-knowledge-backup",
    backupVersion: 1,
    exportedAt: "2026-11-07T18:00:00.000Z",
    snapshot: { schemaVersion: 9 },
  }), /Unsupported knowledge snapshot version/);
  assert.deepEqual(store.getSnapshot(), before);
});

test("migrates version zero flat evidence snapshots through to version three", () => {
  const migrated = migrateKnowledgeSnapshot({
    schemaVersion: 0,
    records: [evidence("legacy-001")],
  }, { clock: fixedClock });
  assert.equal(migrated.schemaVersion, 4);
  assert.equal(migrated.evidence.records.length, 1);
  assert.equal(migrated.metadata.createdAt, "2026-11-07T18:00:00.000Z");
});

test("rejects malformed snapshots and invalid adapters", async () => {
  assert.throws(() => migrateKnowledgeSnapshot({ schemaVersion: 1 }), /metadata/);
  await assert.rejects(() => KnowledgeStore.open({ adapter: {} }), /implement/);
});

test("a failed storage write does not publish an uncommitted state", async () => {
  const memory = new MemoryKnowledgeAdapter();
  let fail = false;
  const adapter = {
    readSnapshot: () => memory.readSnapshot(),
    writeSnapshot: async snapshot => {
      if (fail) throw new Error("disk full");
      await memory.writeSnapshot(snapshot);
    },
  };
  const store = await KnowledgeStore.open({ adapter, clock: fixedClock });
  fail = true;
  await assert.rejects(() => store.addEvidence(evidence("ev-fail")), /disk full/);
  assert.equal(store.getEvidenceStore().size, 0);
  assert.equal((await memory.readSnapshot()).evidence.records.length, 0);
});

test("persists a valid legacy migration and rejects corrupt stored snapshots", async () => {
  let persisted = {
    schemaVersion: 0,
    records: [evidence("legacy-persisted")],
  };
  const adapter = {
    readSnapshot: async () => persisted,
    writeSnapshot: async snapshot => { persisted = JSON.parse(JSON.stringify(snapshot)); },
  };
  const store = await KnowledgeStore.open({ adapter, clock: fixedClock });
  assert.equal(store.queryEvidence()[0].id, "legacy-persisted");
  assert.equal(persisted.schemaVersion, 4);

  let writes = 0;
  const corruptAdapter = {
    readSnapshot: async () => ({ schemaVersion: 1, evidence: { schemaVersion: 1, records: [] } }),
    writeSnapshot: async () => { writes += 1; },
  };
  await assert.rejects(() => KnowledgeStore.open({ adapter: corruptAdapter, clock: fixedClock }), /metadata/);
  assert.equal(writes, 0);
});

test("backup merge never removes records already present in the destination", async () => {
  const incomingAdapter = new MemoryKnowledgeAdapter();
  const incomingStore = await KnowledgeStore.open({ adapter: incomingAdapter, clock: fixedClock });
  await incomingStore.addEvidence(evidence("incoming-record"));
  const backup = incomingStore.exportBackup();

  const destinationAdapter = new MemoryKnowledgeAdapter();
  const destination = await KnowledgeStore.open({ adapter: destinationAdapter, clock: fixedClock });
  await destination.addEvidence(evidence("destination-record"));
  await destination.importBackup(backup);

  const ids = destination.queryEvidence().map(record => record.id).sort();
  assert.deepEqual(ids, ["destination-record", "incoming-record"]);
});

test("persists normalized catalog products and rebuilds local search after reopening", async () => {
  const adapter = new MemoryKnowledgeAdapter();
  const store = await KnowledgeStore.open({ adapter, clock: fixedClock });
  const product = await store.addProduct({
    id: "phone-local-001",
    domain: "technology",
    name: "Galaxy S24 Ultra",
    brand: "Samsung",
    model: "SM-S928B",
    aliases: ["S24 Ultra"],
    deviceType: "smartphone",
    attributes: { ramGB: 12, storageGB: 256, chipset: "Snapdragon 8 Gen 3" },
    evidenceIds: {},
  });
  assert.equal(product.model, "SM-S928B");
  const reopened = await KnowledgeStore.open({ adapter, clock: fixedClock });
  assert.equal(reopened.getProducts({ domain: "technology" }).length, 1);
  assert.equal(reopened.searchProducts({ query: "s24 ultra" })[0].product.id, "phone-local-001");
  assert.equal(reopened.getSnapshot().catalog.schemaVersion, 1);
});

test("catalog rejects duplicate IDs and missing evidence references", async () => {
  const adapter = new MemoryKnowledgeAdapter();
  const store = await KnowledgeStore.open({ adapter, clock: fixedClock });
  const product = {
    id: "phone-duplicate", domain: "technology", name: "Phone",
    deviceType: "smartphone", attributes: {}, evidenceIds: {},
  };
  await store.addProduct(product);
  await assert.rejects(() => store.addProduct(product), /already exists/);
  await assert.rejects(() => store.addProduct({
    ...product, id: "phone-bad-evidence", evidenceIds: { storageGB: ["missing-evidence"] },
  }), /missing evidence/);
  assert.equal(store.getProducts().length, 1);
});

test("backup merge includes new catalog records but never overwrites an existing product ID", async () => {
  const sourceAdapter = new MemoryKnowledgeAdapter();
  const sourceStore = await KnowledgeStore.open({ adapter: sourceAdapter, clock: fixedClock });
  await sourceStore.addProduct({
    id: "product-new", domain: "fragrance", name: "Layton",
    brand: "Parfums de Marly", productType: "perfume", attributes: {}, evidenceIds: {},
  });
  const backup = sourceStore.exportBackup();
  const targetAdapter = new MemoryKnowledgeAdapter();
  const target = await KnowledgeStore.open({ adapter: targetAdapter, clock: fixedClock });
  const preview = await target.previewImport(backup);
  assert.equal(preview.newProductCount, 1);
  await target.importBackup(backup);
  assert.equal(target.getProducts().length, 1);
  assert.equal((await target.importBackup(backup)).newProductCount, 0);
});

test("migrates version one evidence snapshots through to version three with an empty catalog and local profile", () => {
  const migrated = migrateKnowledgeSnapshot({
    schemaVersion: 1,
    metadata: {
      createdAt: "2026-11-07T18:00:00.000Z",
      updatedAt: "2026-11-07T18:00:00.000Z",
    },
    evidence: { schemaVersion: 1, records: [] },
  }, { clock: fixedClock });
  assert.equal(migrated.schemaVersion, 4);
  assert.deepEqual(migrated.catalog.products, []);
  assert.equal(migrated.profiles.items[0].id, "local-default");
});

test("catalog evidence references are grouped by attribute and checked against the ledger", async () => {
  const adapter = new MemoryKnowledgeAdapter();
  const store = await KnowledgeStore.open({ adapter, clock: fixedClock });
  await store.addEvidence(evidence("ev-storage", "256 GB"));
  const product = await store.addProduct({
    id: "phone-evidence-linked", domain: "technology", name: "Evidence Phone",
    deviceType: "smartphone", attributes: { storageGB: 256 },
    evidenceIds: { storageGB: ["ev-storage"] },
  });
  assert.deepEqual(product.evidenceIds, { storageGB: ["ev-storage"] });
  assert.equal(store.getProducts()[0].evidenceIds.storageGB[0], "ev-storage");
});


test("KnowledgeStore exposes identity-aware matching without changing persisted catalog rows", async () => {
  const adapter = new MemoryKnowledgeAdapter();
  const store = await KnowledgeStore.open({ adapter, clock: fixedClock });
  await store.addProduct({
    id: "catalog-s25", domain: "technology", name: "Samsung Galaxy S25 Ultra",
    brand: "Samsung", model: "Galaxy S25 Ultra", deviceType: "smartphone",
    attributes: { ramGB: 12, storageGB: 256 },
  });
  const incoming = {
    id: "incoming-s25", domain: "technology", name: "Samsung S25 Ultra",
    brand: "Samsung", model: "Galaxy S25 Ultra", deviceType: "smartphone",
    attributes: { ramGB: 12, storageGB: 256 },
  };
  const before = store.getProducts().length;
  const matches = store.findProductMatches(incoming);
  assert.equal(matches[0].rightId, "catalog-s25");
  assert.equal(store.getProducts().length, before);
});


test("migrates schema v2 snapshots to v3 with a default local fragrance profile", () => {
  const migrated = migrateKnowledgeSnapshot({
    schemaVersion: 2,
    metadata: {
      createdAt: "2026-11-07T18:00:00.000Z",
      updatedAt: "2026-11-07T18:00:00.000Z",
    },
    evidence: { schemaVersion: 1, records: [] },
    catalog: { schemaVersion: 1, products: [] },
  }, { clock: fixedClock });
  assert.equal(migrated.schemaVersion, 4);
  assert.equal(migrated.profiles.items[0].id, "local-default");
  assert.deepEqual(migrated.profiles.items[0].preferredFamilies, []);
});

test("persists an olfactory profile and product ratings across KnowledgeStore reopen", async () => {
  const adapter = new MemoryKnowledgeAdapter();
  const first = await KnowledgeStore.open({ adapter, clock: fixedClock });
  await first.addProduct({
    id: "fragrance-local-001",
    domain: "fragrance",
    name: "Woody Example",
    brand: "Example House",
    productType: "perfume",
    attributes: { scentFamilies: ["Wood & Root"], allNotes: ["Cedarwood", "Vetiver"] },
    evidenceIds: {},
  });
  await first.saveFragranceProfile({
    preferredFamilies: ["woody"],
    avoidFamilies: ["gourmand"],
    preferredNotes: ["cedarwood"],
    avoidNotes: ["coconut"],
    occasion: "day",
    climate: "hot_humid",
  });
  await first.recordFragranceFeedback({ productId: "fragrance-local-001", rating: 5 });

  const reopened = await KnowledgeStore.open({ adapter, clock: fixedClock });
  const profile = reopened.getFragranceProfile();
  assert.deepEqual(profile.preferredFamilies, ["woody"]);
  assert.deepEqual(profile.avoidFamilies, ["gourmand"]);
  assert.deepEqual(profile.preferredNotes, ["cedarwood"]);
  assert.equal(profile.feedback.length, 1);
  assert.equal(profile.feedback[0].productId, "fragrance-local-001");
  assert.equal(profile.feedback[0].rating, 5);
});

test("profile feedback rejects unknown products and invalid ratings without changing state", async () => {
  const adapter = new MemoryKnowledgeAdapter();
  const store = await KnowledgeStore.open({ adapter, clock: fixedClock });
  await assert.rejects(
    () => store.recordFragranceFeedback({ productId: "missing", rating: 5 }),
    /only be recorded for a fragrance/,
  );
  await store.addProduct({
    id: "fragrance-rating-check",
    domain: "fragrance",
    name: "Rating Check",
    brand: "Example House",
    productType: "perfume",
    attributes: {},
    evidenceIds: {},
  });
  await assert.rejects(
    () => store.recordFragranceFeedback({ productId: "fragrance-rating-check", rating: 6 }),
    /integer from 1 to 5/,
  );
  assert.equal(store.getFragranceProfile().feedback.length, 0);
});


test("updates the existing product rating instead of creating duplicate feedback votes", async () => {
  const adapter = new MemoryKnowledgeAdapter();
  const store = await KnowledgeStore.open({ adapter, clock: fixedClock });
  await store.addProduct({
    id: "fragrance-rating-update",
    domain: "fragrance",
    name: "Rating Update",
    brand: "Example House",
    productType: "perfume",
    attributes: { scentFamilies: ["Wood & Root"] },
    evidenceIds: {},
  });
  await store.recordFragranceFeedback({ productId: "fragrance-rating-update", rating: 5 });
  const firstId = store.getFragranceProfile().feedback[0].id;
  await store.recordFragranceFeedback({ productId: "fragrance-rating-update", rating: 1 });
  const feedback = store.getFragranceProfile().feedback;
  assert.equal(feedback.length, 1);
  assert.equal(feedback[0].id, firstId);
  assert.equal(feedback[0].rating, 1);
});

test("does not record feedback against an unknown local profile ID", async () => {
  const adapter = new MemoryKnowledgeAdapter();
  const store = await KnowledgeStore.open({ adapter, clock: fixedClock });
  await store.addProduct({
    id: "fragrance-profile-scope",
    domain: "fragrance",
    name: "Profile Scope",
    brand: "Example House",
    productType: "perfume",
    attributes: {},
    evidenceIds: {},
  });
  await assert.rejects(
    () => store.recordFragranceFeedback({
      profileId: "missing-profile",
      productId: "fragrance-profile-scope",
      rating: 5,
    }),
    /Unknown local fragrance profile ID/,
  );
  assert.equal(store.getFragranceProfile().feedback.length, 0);
});


test("migrates schema v3 profiles by adding empty favorites and collection without losing preferences", async () => {
  const adapter = new MemoryKnowledgeAdapter();
  const store = await KnowledgeStore.open({ adapter, clock: fixedClock });
  await store.saveFragranceProfile({
    preferredFamilies: ["woody"],
    avoidNotes: ["coconut"],
  });
  const snapshot = store.getSnapshot();
  const legacyProfile = { ...snapshot.profiles.items[0] };
  delete legacyProfile.favorites;
  delete legacyProfile.collection;
  const migrated = migrateKnowledgeSnapshot({
    ...snapshot,
    schemaVersion: 3,
    profiles: { schemaVersion: 1, items: [legacyProfile] },
  }, { clock: fixedClock });
  assert.equal(migrated.schemaVersion, 4);
  assert.deepEqual(migrated.profiles.items[0].preferredFamilies, ["woody"]);
  assert.deepEqual(migrated.profiles.items[0].avoidNotes, ["coconut"]);
  assert.deepEqual(migrated.profiles.items[0].favorites, []);
  assert.deepEqual(migrated.profiles.items[0].collection, []);
});

test("persists favorites and personal collection states across KnowledgeStore reopen", async () => {
  const adapter = new MemoryKnowledgeAdapter();
  const first = await KnowledgeStore.open({ adapter, clock: fixedClock });
  for (const [id, name] of [["fragrance-owned", "Owned"], ["fragrance-wanted", "Wanted"]]) {
    await first.addProduct({
      id,
      domain: "fragrance",
      name,
      brand: "Example House",
      productType: "perfume",
      attributes: {},
      evidenceIds: {},
    });
  }
  assert.equal(await first.setFragranceFavorite({ productId: "fragrance-owned" }), true);
  await first.saveFragranceCollectionItem({
    productId: "fragrance-owned",
    status: "owned",
    note: "Botella de 100 ml",
  });
  await first.saveFragranceCollectionItem({
    productId: "fragrance-wanted",
    status: "wishlist",
  });
  const updated = await first.saveFragranceCollectionItem({
    productId: "fragrance-wanted",
    status: "sampled",
  });
  assert.equal(updated.status, "sampled");

  const reopened = await KnowledgeStore.open({ adapter, clock: fixedClock });
  const profile = reopened.getFragranceProfile();
  assert.deepEqual(profile.favorites, ["fragrance-owned"]);
  assert.equal(profile.collection.length, 2);
  assert.equal(profile.collection.find(item => item.productId === "fragrance-owned").status, "owned");
  assert.equal(profile.collection.find(item => item.productId === "fragrance-owned").note, "Botella de 100 ml");
  assert.equal(profile.collection.find(item => item.productId === "fragrance-wanted").status, "sampled");
});

test("removing a collection item leaves its independent favorite intact", async () => {
  const adapter = new MemoryKnowledgeAdapter();
  const store = await KnowledgeStore.open({ adapter, clock: fixedClock });
  await store.addProduct({
    id: "fragrance-fav-collection",
    domain: "fragrance",
    name: "Favorite Collection",
    brand: "Example House",
    productType: "perfume",
    attributes: {},
    evidenceIds: {},
  });
  await store.setFragranceFavorite({ productId: "fragrance-fav-collection" });
  await store.saveFragranceCollectionItem({ productId: "fragrance-fav-collection", status: "owned" });
  assert.equal(await store.removeFragranceCollectionItem({ productId: "fragrance-fav-collection" }), true);
  assert.equal(await store.removeFragranceCollectionItem({ productId: "fragrance-fav-collection" }), false);
  assert.deepEqual(store.getFragranceProfile().favorites, ["fragrance-fav-collection"]);
  assert.deepEqual(store.getFragranceProfile().collection, []);
});

test("rejects favorites or collection statuses outside the validated fragrance catalog contract", async () => {
  const adapter = new MemoryKnowledgeAdapter();
  const store = await KnowledgeStore.open({ adapter, clock: fixedClock });
  await assert.rejects(
    () => store.setFragranceFavorite({ productId: "missing" }),
    /local catalog/,
  );
  await assert.rejects(
    () => store.saveFragranceCollectionItem({ productId: "missing", status: "owned" }),
    /local catalog/,
  );
  await store.addProduct({
    id: "fragrance-status-check",
    domain: "fragrance",
    name: "Status Check",
    brand: "Example House",
    productType: "perfume",
    attributes: {},
    evidenceIds: {},
  });
  await assert.rejects(
    () => store.saveFragranceCollectionItem({ productId: "fragrance-status-check", status: "invented" }),
    /wishlist, owned or sampled/,
  );
  assert.deepEqual(store.getFragranceProfile().favorites, []);
  assert.deepEqual(store.getFragranceProfile().collection, []);
});
