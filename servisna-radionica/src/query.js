// Query string support in the style of json-server:
//   ?categoryId=2                 exact match (repeat the parameter for "or")
//   ?dailyPrice_gte=10            also _gt, _lte, _lt, _ne, _like  (or dailyPrice:gte=10)
//   ?q=canon                      full-text search over all text fields
//   ?_sort=name  ?_sort=-dailyPrice  ?_sort=categoryId,name
//   ?_page=2&_per_page=10         paginated response with metadata
//   ?_embed=reservations          attach child records, ?_embed=category attaches the parent

const OPERATORS = ["gte", "gt", "lte", "lt", "ne", "like", "contains"];
const RESERVED = new Set(["_sort", "_page", "_per_page", "_embed", "_expand", "q", "_order", "_limit"]);

function compare(a, b) {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return a === b ? 0 : a ? -1 : 1;
  return String(a).localeCompare(String(b), "hr", { sensitivity: "base" });
}

function matches(itemValue, operator, raw) {
  const num = Number(raw);
  const asNumber = typeof itemValue === "number" && raw !== "" && !Number.isNaN(num);
  const v = asNumber ? num : raw;
  switch (operator) {
    case "eq":
      if (typeof itemValue === "boolean") return String(itemValue) === raw;
      return asNumber ? itemValue === num : String(itemValue ?? "").toLowerCase() === String(raw).toLowerCase();
    case "ne":
      return !matches(itemValue, "eq", raw);
    case "gt": return compare(itemValue, v) > 0;
    case "gte": return compare(itemValue, v) >= 0;
    case "lt": return compare(itemValue, v) < 0;
    case "lte": return compare(itemValue, v) <= 0;
    case "like":
    case "contains":
      return String(itemValue ?? "").toLowerCase().includes(String(raw).toLowerCase());
    default:
      return true;
  }
}

function parseFilters(params) {
  const filters = [];
  for (const key of new Set(params.keys())) {
    if (RESERVED.has(key)) continue;
    let field = key;
    let operator = "eq";
    const colon = key.match(/^(.+):([a-z]+)$/);
    const underscore = key.match(/^(.+)_([a-z]+)$/);
    if (colon && OPERATORS.includes(colon[2])) [field, operator] = [colon[1], colon[2]];
    else if (underscore && OPERATORS.includes(underscore[2])) [field, operator] = [underscore[1], underscore[2]];
    filters.push({ field, operator, values: params.getAll(key) });
  }
  return filters;
}

export function applyQuery(items, params, { textFields, embed }) {
  let result = items;

  for (const { field, operator, values } of parseFilters(params)) {
    result = result.filter((item) =>
      operator === "eq"
        ? values.some((raw) => matches(item[field], "eq", raw))
        : values.every((raw) => matches(item[field], operator, raw)),
    );
  }

  const q = params.get("q");
  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    result = result.filter((item) => textFields.some((f) => String(item[f] ?? "").toLowerCase().includes(term)));
  }

  const sort = params.get("_sort");
  if (sort) {
    const keys = sort.split(",").map((k) => k.trim()).filter(Boolean);
    const legacyOrder = params.get("_order") === "desc" ? -1 : 1;
    result = [...result].sort((a, b) => {
      for (const key of keys) {
        const desc = key.startsWith("-");
        const field = desc ? key.slice(1) : key;
        const c = compare(a[field], b[field]) * (desc ? -1 : legacyOrder);
        if (c !== 0) return c;
      }
      return 0;
    });
  }

  const embedNames = [...params.getAll("_embed"), ...params.getAll("_expand")]
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
  if (embedNames.length) result = result.map((item) => embed(item, embedNames));

  if (params.has("_page")) {
    const perPage = Math.max(1, Number(params.get("_per_page") ?? params.get("_limit") ?? 10) || 10);
    const pages = Math.max(1, Math.ceil(result.length / perPage));
    const page = Math.min(Math.max(1, Number(params.get("_page")) || 1), pages);
    return {
      first: 1,
      prev: page > 1 ? page - 1 : null,
      next: page < pages ? page + 1 : null,
      last: pages,
      pages,
      items: result.length,
      data: result.slice((page - 1) * perPage, page * perPage),
    };
  }
  return result;
}
