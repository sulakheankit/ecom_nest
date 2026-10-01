import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const portIndex = process.argv.indexOf("--port");
if (portIndex >= 0) {
  // A supervised preview serves the built full stack on a single origin.
  process.env.PORT = process.argv[portIndex + 1];
  process.env.FRONTEND_URL = `http://terminal.local:${process.env.PORT}`;
  process.env.PUBLIC_URL = process.env.FRONTEND_URL;
  await import("../backend/dist/server.js");
} else {
  const child = spawn(
    process.execPath,
    [
      resolve(root, "node_modules/concurrently/dist/bin/concurrently.js"),
      "npm run dev -w backend",
      "npm run dev -w frontend",
    ],
    { cwd: root, stdio: "inherit" },
  );
  child.on("exit", (code) => process.exit(code || 0));
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => child.kill(signal));
}
