// A tiny JSON file database. The whole database is kept in memory and written
// back to data/db.json after every change. data/seed.json is the initial state.
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";

export function openDb(dbPath, seedPath) {
  if (!existsSync(dbPath)) copyFileSync(seedPath, dbPath);
  const data = JSON.parse(readFileSync(dbPath, "utf8"));

  function save() {
    writeFileSync(dbPath, JSON.stringify(data, null, 2));
  }

  function nextId(collection) {
    const items = data[collection] ?? [];
    return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  }

  return {
    all: (collection) => data[collection] ?? [],
    find: (collection, id) => (data[collection] ?? []).find((item) => String(item.id) === String(id)),
    insert(collection, record) {
      const created = { id: nextId(collection), ...record };
      data[collection] = [...(data[collection] ?? []), created];
      save();
      return created;
    },
    replace(collection, id, record) {
      const updated = { ...record, id: Number(id) };
      data[collection] = data[collection].map((item) => (String(item.id) === String(id) ? updated : item));
      save();
      return updated;
    },
    remove(collection, id) {
      data[collection] = data[collection].filter((item) => String(item.id) !== String(id));
      save();
    },
    removeWhere(collection, predicate) {
      data[collection] = (data[collection] ?? []).filter((item) => !predicate(item));
      save();
    },
  };
}
