import { db, transaction, closeDB } from "../backend/src/config/db.js";
import { readdir, readFile } from "node:fs/promises";
await db.query(
  "CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
);
for (const name of (await readdir(new URL("./migrations/", import.meta.url)))
  .filter((x) => x.endsWith(".sql"))
  .sort()) {
  if (
    (await db.query("SELECT name FROM migrations WHERE name=$1", [name])).rows
      .length
  )
    continue;
  const sql = await readFile(
    new URL("./migrations/" + name, import.meta.url),
    "utf8",
  );
  await transaction(async (tx) => {
    for (const statement of sql
      .split(";")
      .map((x) => x.trim())
      .filter(Boolean))
      await tx.query(statement);
    await tx.query("INSERT INTO migrations(name) VALUES($1)", [name]);
  });
  console.log("Applied", name);
}
await closeDB();
