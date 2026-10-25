// HTTP server: REST routes for every resource in domain.js, authentication and CORS.
import { createServer } from "node:http";
import { applyQuery } from "./query.js";
import { validateRecord } from "./validate.js";
import { signToken, verifyToken, hashPassword, checkPassword } from "./security.js";

const MESSAGES = {
  notFound: "Zapis ne postoji.",
  noRoute: "Ruta ne postoji.",
  badJson: "Tijelo zahtjeva nije ispravan JSON.",
  invalid: "Podaci nisu ispravni.",
  loginRequired: "Za ovu je radnju potrebna prijava.",
  tokenInvalid: "Prijava je istekla ili nije valjana. Prijavite se ponovno.",
  forbidden: "Nemate ovlasti za ovu radnju.",
  badCredentials: "Neispravna adresa e-pošte ili lozinka.",
  server: "Na poslužitelju je došlo do pogreške.",
};

class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const publicUser = ({ passwordHash, ...user }) => user;

export function createApp({ db, domain, config }) {
  const resources = domain.resources;

  // relations: for every ref field, the child collection, the foreign key and the parent collection
  const relations = [];
  for (const [collection, resource] of Object.entries(resources)) {
    for (const [field, def] of Object.entries(resource.fields)) {
      if (def.type === "ref") relations.push({ child: collection, fk: field, parent: def.to, def });
    }
  }

  function embed(collection, item, names) {
    const out = { ...item };
    for (const name of names) {
      const asChild = relations.find((r) => r.parent === collection && r.child === name);
      if (asChild) {
        out[name] = db.all(name).filter((c) => String(c[asChild.fk]) === String(item.id));
        continue;
      }
      const asParent = relations.find((r) => r.child === collection && r.fk === `${name}Id`);
      if (asParent) {
        const parent = db.find(asParent.parent, item[asParent.fk]);
        out[name] = parent && asParent.parent === "users" ? publicUser(parent) : parent ?? null;
      }
    }
    return out;
  }

  // ---------- authentication ----------
  function readUser(req) {
    const header = req.headers.authorization;
    if (!header) return null;
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const payload = verifyToken(token, config.jwtSecret);
    if (!payload) throw new HttpError(401, MESSAGES.tokenInvalid);
    const user = db.find("users", payload.sub);
    if (!user) throw new HttpError(401, MESSAGES.tokenInvalid);
    return user;
  }

  function allow(rule, user, record) {
    if (!config.requireAuth && rule !== "staff-always") return;
    if (!rule || rule === "public") return;
    if (!user) throw new HttpError(401, MESSAGES.loginRequired);
    if (user.role === domain.staffRole) return;
    if (rule === "user") return;
    if (rule === "owner" && record && String(record.userId) === String(user.id)) return;
    throw new HttpError(403, MESSAGES.forbidden);
  }

  function issueToken(user) {
    return {
      token: signToken({ sub: user.id, name: user.name, role: user.role }, config.jwtSecret, config.jwtExpiresIn),
      user: publicUser(user),
    };
  }

  function login(body) {
    const email = String(body?.email ?? "").trim().toLowerCase();
    const user = db.all("users").find((u) => u.email.toLowerCase() === email);
    if (!user || !checkPassword(String(body?.password ?? ""), user.passwordHash)) {
      throw new HttpError(401, MESSAGES.badCredentials);
    }
    return issueToken(user);
  }

  function register(body) {
    const fields = {};
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    if (name.length < 2) fields.name = "Unesite ime i prezime.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.email = "Unesite ispravnu adresu e-pošte.";
    else if (db.all("users").some((u) => u.email.toLowerCase() === email)) fields.email = "Račun s tom adresom već postoji.";
    if (password.length < 8) fields.password = "Lozinka mora imati najmanje 8 znakova.";
    if (Object.keys(fields).length) throw new HttpError(400, MESSAGES.invalid, fields);
    const user = db.insert("users", { name, email, role: domain.defaultRole, passwordHash: hashPassword(password) });
    return issueToken(user);
  }

  // ---------- CRUD ----------
  function prepare(collection, resource, body, { method, id, existing, user }) {
    const input = method === "PATCH" ? { ...existing, ...body } : { ...body };
    if ("userId" in resource.fields && user && user.role !== domain.staffRole) input.userId = user.id;
    if ("userId" in resource.fields && input.userId == null) input.userId = user?.id ?? domain.anonymousUserId ?? null;
    const ctx = { db, collection, id, method, existing, user, today: new Date().toISOString().slice(0, 10) };
    const { record, fields } = validateRecord(resource, input, ctx);
    if (fields) throw new HttpError(400, MESSAGES.invalid, fields);
    return record;
  }

  function removeWithChildren(collection, id) {
    for (const r of relations.filter((rel) => rel.parent === collection)) {
      const children = db.all(r.child).filter((c) => String(c[r.fk]) === String(id));
      if (!children.length) continue;
      if (r.def.onDelete === "cascade") {
        for (const child of children) removeWithChildren(r.child, child.id);
      } else {
        throw new HttpError(409, r.def.restrictMessage ?? "Zapis ima povezane zapise i ne može se obrisati.");
      }
    }
    db.remove(collection, id);
  }

  function handleCollection(req, url, body, user, segments) {
    const [collection, id, childName] = segments;
    const resource = resources[collection];
    if (!resource) throw new HttpError(404, MESSAGES.noRoute);
    const perm = resource.permissions ?? {};
    const textFields = Object.entries(resource.fields).filter(([, f]) => f.type === "string").map(([n]) => n);

    // /parent/:id/children
    if (childName) {
      const rel = relations.find((r) => r.parent === collection && r.child === childName);
      if (!rel) throw new HttpError(404, MESSAGES.noRoute);
      if (!db.find(collection, id)) throw new HttpError(404, MESSAGES.notFound);
      const childResource = resources[childName];
      if (req.method === "GET") {
        allow(childResource.permissions?.read, user);
        const childText = Object.entries(childResource.fields).filter(([, f]) => f.type === "string").map(([n]) => n);
        const items = db.all(childName).filter((c) => String(c[rel.fk]) === String(id));
        return [200, applyQuery(items, url.searchParams, { textFields: childText, embed: (it, n) => embed(childName, it, n) })];
      }
      if (req.method === "POST") {
        allow(childResource.permissions?.create, user);
        const record = prepare(childName, childResource, { ...body, [rel.fk]: Number(id) }, { method: "POST", user });
        return [201, db.insert(childName, record)];
      }
      throw new HttpError(405, MESSAGES.noRoute);
    }

    if (!id) {
      if (req.method === "GET") {
        allow(perm.read, user);
        return [200, applyQuery(db.all(collection), url.searchParams, { textFields, embed: (it, n) => embed(collection, it, n) })];
      }
      if (req.method === "POST") {
        allow(perm.create, user);
        const record = prepare(collection, resource, body, { method: "POST", user });
        return [201, db.insert(collection, record)];
      }
      throw new HttpError(405, MESSAGES.noRoute);
    }

    const existing = db.find(collection, id);
    if (!existing) throw new HttpError(404, MESSAGES.notFound);
    switch (req.method) {
      case "GET": {
        allow(perm.read, user);
        const names = [...url.searchParams.getAll("_embed"), ...url.searchParams.getAll("_expand")].flatMap((v) => v.split(","));
        return [200, names.length ? embed(collection, existing, names.map((n) => n.trim())) : existing];
      }
      case "PUT":
      case "PATCH": {
        allow(perm.update, user, existing);
        const record = prepare(collection, resource, body, { method: req.method, id, existing, user });
        return [200, db.replace(collection, id, record)];
      }
      case "DELETE":
        allow(perm.delete, user, existing);
        removeWithChildren(collection, id);
        return [204, null];
      default:
        throw new HttpError(405, MESSAGES.noRoute);
    }
  }

  function route(req, url, body) {
    const segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    if (segments.length === 0 && req.method === "GET") {
      return [200, {
        name: domain.name,
        resources: Object.keys(resources).map((r) => `/${r}`),
        auth: ["POST /login", "POST /register", "GET /me"],
        requireAuth: config.requireAuth,
      }];
    }
    if (segments[0] === "login" && req.method === "POST") return [200, login(body)];
    if (segments[0] === "register" && req.method === "POST") return [201, register(body)];

    const user = readUser(req);
    if (segments[0] === "me" && req.method === "GET") {
      if (!user) throw new HttpError(401, MESSAGES.loginRequired);
      return [200, publicUser(user)];
    }
    if (segments[0] === "users" && req.method === "GET") {
      if (!user) throw new HttpError(401, MESSAGES.loginRequired);
      if (segments[1]) {
        if (user.role !== domain.staffRole && String(user.id) !== segments[1]) throw new HttpError(403, MESSAGES.forbidden);
        const found = db.find("users", segments[1]);
        if (!found) throw new HttpError(404, MESSAGES.notFound);
        return [200, publicUser(found)];
      }
      if (user.role !== domain.staffRole) throw new HttpError(403, MESSAGES.forbidden);
      return [200, db.all("users").map(publicUser)];
    }
    if (segments.length > 3) throw new HttpError(404, MESSAGES.noRoute);
    return handleCollection(req, url, body, user, segments);
  }

  // ---------- CORS ----------
  function allowedOrigin(origin) {
    if (!origin) return null;
    const setting = config.corsOrigin.trim();
    if (setting === "*") return origin;
    if (setting === "localhost") {
      return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ? origin : null;
    }
    return setting.split(",").map((o) => o.trim()).includes(origin) ? origin : null;
  }

  function send(req, res, status, payload, started) {
    const origin = allowedOrigin(req.headers.origin);
    const headers = { "Content-Type": "application/json; charset=utf-8" };
    if (origin) {
      headers["Access-Control-Allow-Origin"] = origin;
      headers["Vary"] = "Origin";
      headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
      headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
    }
    res.writeHead(status, headers);
    res.end(payload === null || status === 204 ? undefined : JSON.stringify(payload));
    const ms = Date.now() - started;
    const color = status >= 500 ? 31 : status >= 400 ? 33 : 32;
    console.log(`\x1b[${color}m${req.method.padEnd(6)} ${status}\x1b[0m ${req.url} (${ms} ms)`);
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      let raw = "";
      req.on("data", (chunk) => { raw += chunk; });
      req.on("end", () => {
        if (!raw.trim()) return resolve({});
        try { resolve(JSON.parse(raw)); } catch { reject(new HttpError(400, MESSAGES.badJson)); }
      });
      req.on("error", reject);
    });
  }

  return createServer(async (req, res) => {
    const started = Date.now();
    try {
      if (req.method === "OPTIONS") return send(req, res, 204, null, started);
      if (config.delayMs > 0) await sleep(config.delayMs);
      const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
      const body = ["POST", "PUT", "PATCH"].includes(req.method) ? await readBody(req) : null;
      const [status, payload] = route(req, url, body);
      send(req, res, status, payload, started);
    } catch (err) {
      if (err instanceof HttpError) {
        send(req, res, err.status, err.fields ? { message: err.message, fields: err.fields } : { message: err.message }, started);
      } else {
        console.error(err);
        send(req, res, 500, { message: MESSAGES.server }, started);
      }
    }
  });
}
