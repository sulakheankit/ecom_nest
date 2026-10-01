import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
if (!existsSync(resolve(root, ".env")))
  writeFileSync(
    resolve(root, ".env"),
    `DB_MODE=embedded\nJWT_SECRET=${randomBytes(48).toString("hex")}\nPORT=5000\nFRONTEND_URL=http://localhost:5173\nPUBLIC_URL=http://localhost:5173\nCOOKIE_SECURE=false\nSEED_ADMIN_PASSWORD=NestAdmin!2026\nSEED_CUSTOMER_PASSWORD=NestCustomer!2026\n`,
  );
for (const script of ["database/migrate.ts", "database/seed/index.ts"]) {
  const r = spawnSync(process.execPath, ["--import", "tsx", script], {
    cwd: root,
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status || 1);
}
console.log(
  "Local demo ready. Run npm run dev, then open http://localhost:5173.",
);
console.log("Admin: admin@example.com / NestAdmin!2026");
console.log("Customer: customer@example.com / NestCustomer!2026");
