import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import {
  CapacitorSQLiteKnowledgeAdapter,
  DOMAINS,
  KnowledgeStore,
  MemoryKnowledgeAdapter,
} from "../../../src/index.js";

const DATABASE_NAME = "jbae_knowledge";
let sqliteConnection;
let databaseConnection;

async function openNativeDatabase() {
  sqliteConnection = new SQLiteConnection(CapacitorSQLite);
  const consistency = await sqliteConnection.checkConnectionsConsistency();
  const existing = await sqliteConnection.isConnection(DATABASE_NAME, false);

  if (consistency.result && existing.result) {
    databaseConnection = await sqliteConnection.retrieveConnection(DATABASE_NAME, false);
  } else {
    databaseConnection = await sqliteConnection.createConnection(
      DATABASE_NAME, false, "no-encryption", 1, false,
    );
  }

  await databaseConnection.open();
  return new CapacitorSQLiteKnowledgeAdapter({ db: databaseConnection });
}

async function readSeed() {
  const response = await fetch(`${import.meta.env.BASE_URL}seed/fragrance-library.json`);
  if (!response.ok) throw new Error(`No se pudo cargar la biblioteca local (HTTP ${response.status}).`);
  const seed = await response.json();
  if (
    seed?.format !== "jbae-fragrance-seed" ||
    seed?.seedVersion !== 1 ||
    seed?.snapshot?.schemaVersion !== 2
  ) throw new Error("La biblioteca incluida en la aplicación tiene un formato no compatible.");
  return seed;
}

export async function initializeStorage() {
  const native = Capacitor.isNativePlatform();
  const adapter = native ? await openNativeDatabase() : new MemoryKnowledgeAdapter();
  const knowledgeStore = await KnowledgeStore.open({ adapter });
  let fragranceProducts = knowledgeStore.getProducts({ domain: DOMAINS.FRAGRANCE });
  let seed = null;

  if (fragranceProducts.length === 0) {
    seed = await readSeed();
    await knowledgeStore.importBackup({
      format: "jbae-knowledge-backup",
      backupVersion: 1,
      exportedAt: new Date().toISOString(),
      snapshot: seed.snapshot,
    });
    fragranceProducts = knowledgeStore.getProducts({ domain: DOMAINS.FRAGRANCE });
  }
  if (!seed) seed = await readSeed();

  return Object.freeze({
    knowledgeStore,
    native,
    storageLabel: native ? "SQLite nativo" : "Vista previa · memoria temporal",
    dataset: seed.dataset,
    fragranceCount: fragranceProducts.length,
    technologyCount: knowledgeStore.getProducts({ domain: DOMAINS.TECHNOLOGY }).length,
    evidenceCount: knowledgeStore.queryEvidence().length,
  });
}

export async function closeStorage() {
  if (databaseConnection && sqliteConnection) {
    await sqliteConnection.closeConnection(DATABASE_NAME, false);
    databaseConnection = null;
  }
}
