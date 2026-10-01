import { db, transaction, closeDB } from "../backend/dist/config/db.js";
import { readdir, readFile } from "node:fs/promises";
await db.query(
  "CREATE TABLE IF NOT EXISTS migrations(name TEXT PRIMARY KEY,applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
);
for (const name of (
  await readdir(new URL("../database/migrations/", import.meta.url))
)
  .filter((n) => n.endsWith(".sql"))
  .sort()) {
  if (
    (await db.query("SELECT name FROM migrations WHERE name=$1", [name])).rows
      .length
  )
    continue;
  const sql = await readFile(
    new URL("../database/migrations/" + name, import.meta.url),
    "utf8",
  );
  await transaction(async (tx) => {
    for (const s of sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await tx.query(s);
    await tx.query("INSERT INTO migrations(name) VALUES($1)", [name]);
  });
  console.log("Applied", name);
}
await closeDB();
