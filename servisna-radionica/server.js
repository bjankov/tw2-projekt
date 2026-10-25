// Starts the API. Configuration is read from the .env file in this folder.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadEnv, readConfig } from "./src/env.js";
import { openDb } from "./src/db.js";
import { createApp } from "./src/app.js";
import domain from "./domain.js";

const here = dirname(fileURLToPath(import.meta.url));
loadEnv(join(here, ".env"));
const config = readConfig(domain.defaults);
const db = openDb(join(here, "data", "db.json"), join(here, "data", "seed.json"));

createApp({ db, domain, config }).listen(config.port, () => {
  console.log(`\n  ${domain.name}: poslužitelj radi na http://localhost:${config.port}`);
  console.log(`  Provjera prijave za izmjene: ${config.requireAuth ? "uključena" : "isključena"} (REQUIRE_AUTH)`);
  console.log(`  Popis ruta: http://localhost:${config.port}/\n`);
});
