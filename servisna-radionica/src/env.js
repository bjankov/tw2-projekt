// Loads KEY=VALUE pairs from the .env file next to server.js into process.env.
// Values that are already set in the environment are not overwritten.
import { readFileSync, existsSync } from "node:fs";

export function loadEnv(path) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function readConfig(defaults) {
  const env = process.env;
  return {
    port: Number(env.PORT ?? defaults.port),
    jwtSecret: env.JWT_SECRET ?? "change-me",
    jwtExpiresIn: Number(env.JWT_EXPIRES_IN ?? 7200),
    requireAuth: String(env.REQUIRE_AUTH ?? defaults.requireAuth) === "true",
    corsOrigin: env.CORS_ORIGIN ?? "localhost",
    delayMs: Number(env.DELAY_MS ?? 0),
  };
}
