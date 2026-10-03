import fs from "fs";
import path from "path";
import { AsyncLocalStorage } from "node:async_hooks";
import type { PoolClient } from "pg";
import { getPool } from "@workspace/db";
import type { AppDatabase } from "../honda-types";

const IS_VERCEL = process.env.VERCEL === "1";
const DATA_DIR = IS_VERCEL ? path.join("/tmp", "rais-honda-data") : path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const LEGACY_DB_FILES = [
  DB_FILE,
  path.join(process.cwd(), "artifacts", "api-server", "data", "db.json"),
];
const BACKUPS_DIR = path.join(DATA_DIR, "backups");
const STATE_ID = "primary";
const LOCK_KEY = "rais_honda_global_write";

export type RequestState = {
  db: AppDatabase;
  lockClient?: PoolClient;
  persistent: boolean;
};

export const stateContext = new AsyncLocalStorage<RequestState>();

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function getRequestDatabase(): AppDatabase | undefined {
  return stateContext.getStore()?.db;
}

export async function acquireWriteLock(): Promise<PoolClient | undefined> {
  if (!process.env.DATABASE_URL) return undefined;
  const pool = getPool();
  const client = await pool.connect();
  await client.query("SELECT pg_advisory_lock(hashtext($1))", [LOCK_KEY]);
  return client;
}

export async function releaseWriteLock(client?: PoolClient): Promise<void> {
  if (!client) return;
  try {
    await client.query("SELECT pg_advisory_unlock(hashtext($1))", [LOCK_KEY]);
  } finally {
    client.release();
  }
}

export async function ensurePersistentStore(seed: AppDatabase): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      version BIGINT NOT NULL DEFAULT 1,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const result = await pool.query<{ id: string }>("SELECT id FROM app_state WHERE id = $1", [STATE_ID]);
  if (result.rowCount === 0) {
    let initialData = clone(seed);
    for (const legacyPath of LEGACY_DB_FILES) {
      try {
        if (fs.existsSync(legacyPath)) {
          initialData = normalizeDatabase(JSON.parse(fs.readFileSync(legacyPath, "utf8")) as AppDatabase, seed);
          break;
        }
      } catch {
        // Try the next candidate path.
      }
    }
    await pool.query(
      "INSERT INTO app_state (id, data, version, updated_at) VALUES ($1, $2::jsonb, 1, NOW()) ON CONFLICT (id) DO NOTHING",
      [STATE_ID, JSON.stringify(initialData)],
    );
  }
}

export function readFileDatabase(seed: AppDatabase): AppDatabase {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
      return clone(seed);
    }
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as AppDatabase;
    return normalizeDatabase(parsed, seed);
  } catch {
    return clone(seed);
  }
}

function normalizeDatabase(data: AppDatabase, seed: AppDatabase): AppDatabase {
  const normalized = { ...clone(seed), ...data } as AppDatabase;
  normalized.users = Array.isArray(data.users) && data.users.length ? data.users : clone(seed.users);
  normalized.products = Array.isArray(data.products) ? data.products : [];
  normalized.invoices = Array.isArray(data.invoices) ? data.invoices : [];
  normalized.purchases = Array.isArray(data.purchases) ? data.purchases : [];
  normalized.services = Array.isArray(data.services) ? data.services : [];
  normalized.expenses = Array.isArray(data.expenses) ? data.expenses : [];
  normalized.accounts = Array.isArray(data.accounts) ? data.accounts : [];
  normalized.ledger = Array.isArray(data.ledger) ? data.ledger : [];
  normalized.customers = Array.isArray(data.customers) ? data.customers : [];
  normalized.suppliers = Array.isArray(data.suppliers) ? data.suppliers : [];
  normalized.activityLogs = Array.isArray(data.activityLogs) ? data.activityLogs : [];
  normalized.backups = Array.isArray(data.backups) ? data.backups : [];
  normalized.stockAdjustments = Array.isArray(data.stockAdjustments) ? data.stockAdjustments : [];
  normalized.fbrSyncQueue = Array.isArray(data.fbrSyncQueue) ? data.fbrSyncQueue : [];
  normalized.terminalSyncLogs = Array.isArray(data.terminalSyncLogs) ? data.terminalSyncLogs : [];
  normalized.analyticsCache = data.analyticsCache || clone(seed.analyticsCache);
  return normalized;
}

export async function loadPersistentDatabase(seed: AppDatabase): Promise<AppDatabase> {
  if (!process.env.DATABASE_URL) return readFileDatabase(seed);
  await ensurePersistentStore(seed);
  const pool = getPool();
  const result = await pool.query<{ data: AppDatabase }>("SELECT data FROM app_state WHERE id = $1", [STATE_ID]);
  return normalizeDatabase(result.rows[0]?.data || seed, seed);
}

export async function savePersistentDatabase(data: AppDatabase): Promise<void> {
  const normalized = clone(data);

  if (!process.env.DATABASE_URL) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(normalized, null, 2));
    fs.renameSync(tmp, DB_FILE);
    return;
  }

  const pool = getPool();
  await pool.query(
    `UPDATE app_state
       SET data = $2::jsonb,
           version = version + 1,
           updated_at = NOW()
     WHERE id = $1`,
    [STATE_ID, JSON.stringify(normalized)],
  );
}

export function sanitizeDatabaseForClient(data: AppDatabase): AppDatabase {
  const safe = clone(data);
  safe.users = safe.users.map((user) => {
    const { password: _password, ...publicUser } = user;
    return publicUser;
  });
  return safe;
}
