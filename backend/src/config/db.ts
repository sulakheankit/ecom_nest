import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
export const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
dotenv.config({ path: resolve(ROOT, ".env"), quiet: true });
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
export type DB = {
  query: (
    sql: string,
    params?: any[],
  ) => Promise<{ rows: any[]; rowCount?: number }>;
};
const embedded = process.env.DB_MODE === "embedded";
if (embedded && process.env.NODE_ENV === "production")
  throw new Error(
    "Embedded demonstration database is not allowed in production",
  );
if (embedded) mkdirSync(resolve(ROOT, ".data"), { recursive: true });
const lite = embedded
  ? new PGlite(process.env.DB_PATH || resolve(ROOT, ".data/postgres"))
  : null;
const pool = embedded
  ? null
  : new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.DB_SSL === "true"
          ? { rejectUnauthorized: true }
          : undefined,
    });
export const db: DB = {
  query: async (sql, params = []) =>
    lite
      ? ((await lite.query(sql, params)) as any)
      : await pool!.query(sql, params),
};
let queue: Promise<any> = Promise.resolve();
export async function transaction<T>(fn: (tx: DB) => Promise<T>): Promise<T> {
  if (lite) {
    const work = queue.then(() =>
      lite.transaction(async (tx) =>
        fn({ query: async (s, p = []) => tx.query(s, p) as any }),
      ),
    );
    queue = work.catch(() => {});
    return work;
  }
  const client = await pool!.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
export async function closeDB() {
  if (lite) await lite.close();
  else await pool!.end();
}
