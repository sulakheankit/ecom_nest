import { app } from "./app.js";
import { closeDB } from "./config/db.js";
const server = app.listen(Number(process.env.PORT || 5000), "0.0.0.0", () =>
  console.log("Nest API listening on port " + (process.env.PORT || 5000)),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close(async () => {
      await closeDB();
      process.exit(0);
    });
  });
