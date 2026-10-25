// JSON Web Tokens (HS256) and password hashing, built only on node:crypto.
import { createHmac, scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const base64url = (input) => Buffer.from(input).toString("base64url");

export function signToken(payload, secret, expiresInSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSeconds }));
  const signature = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

// Returns the payload, or null when the token is malformed, forged or expired.
export function verifyToken(token, secret) {
  const parts = String(token).split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function checkPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 32);
  const known = Buffer.from(hash, "hex");
  return known.length === candidate.length && timingSafeEqual(known, candidate);
}
