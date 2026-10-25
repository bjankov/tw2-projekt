// Restores the database to its initial state: data/seed.json -> data/db.json.
import { copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
copyFileSync(join(root, "data", "seed.json"), join(root, "data", "db.json"));
console.log("Baza je vraćena u početno stanje.");
