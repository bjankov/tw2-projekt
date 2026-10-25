// Validation of incoming records against the field definitions in domain.js.
// Returns the cleaned record and an object with one message per invalid field.

const DEFAULT_MESSAGES = {
  required: () => "Ovo je polje obavezno.",
  string: () => "Vrijednost mora biti tekst.",
  minLength: (f) => `Unesite najmanje ${f.minLength} znakova.`,
  maxLength: (f) => `Unesite najviše ${f.maxLength} znakova.`,
  pattern: () => "Vrijednost nije u ispravnom obliku.",
  enum: (f) => `Dopuštene su vrijednosti: ${f.enum.join(", ")}.`,
  number: () => "Vrijednost mora biti broj.",
  integer: () => "Vrijednost mora biti cijeli broj.",
  min: (f) => `Vrijednost ne smije biti manja od ${f.min}.`,
  max: (f) => `Vrijednost ne smije biti veća od ${f.max}.`,
  boolean: () => "Vrijednost mora biti true ili false.",
  date: () => "Datum mora biti u obliku GGGG-MM-DD.",
  time: () => "Vrijeme mora biti u obliku HH:MM.",
  ref: () => "Odabrani zapis ne postoji.",
  unique: () => "Ta vrijednost već postoji.",
};

const isEmpty = (v) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

export const isValidDate = (v) => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

export const isValidTime = (v) => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

function message(field, rule) {
  return field.messages?.[rule] ?? DEFAULT_MESSAGES[rule](field);
}

// Converts the value to the declared type where that is unambiguous ("15" -> 15, "true" -> true).
function coerce(field, value) {
  if (isEmpty(value)) return null;
  if ((field.type === "number" || field.type === "ref") && typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  if (field.type === "boolean" && (value === "true" || value === "false")) return value === "true";
  if (typeof value === "string") return value.trim();
  return value;
}

function checkField(name, field, value, ctx) {
  if (value === null) {
    return field.required ? message(field, "required") : null;
  }
  switch (field.type) {
    case "string":
      if (typeof value !== "string") return message(field, "string");
      if (field.minLength && value.length < field.minLength) return message(field, "minLength");
      if (field.maxLength && value.length > field.maxLength) return message(field, "maxLength");
      if (field.pattern && !new RegExp(field.pattern).test(value)) return message(field, "pattern");
      if (field.enum && !field.enum.includes(value)) return message(field, "enum");
      break;
    case "number":
      if (typeof value !== "number" || Number.isNaN(value)) return message(field, "number");
      if (field.integer && !Number.isInteger(value)) return message(field, "integer");
      if (field.enum && !field.enum.includes(value)) return message(field, "enum");
      if (field.min !== undefined && value < field.min) return message(field, "min");
      if (field.max !== undefined && value > field.max) return message(field, "max");
      break;
    case "boolean":
      if (typeof value !== "boolean") return message(field, "boolean");
      break;
    case "date":
      if (!isValidDate(value)) return message(field, "date");
      break;
    case "time":
      if (!isValidTime(value)) return message(field, "time");
      break;
    case "ref":
      if (!ctx.db.find(field.to, value)) return message(field, "ref");
      break;
  }
  if (field.unique) {
    const taken = ctx.db
      .all(ctx.collection)
      .some((item) => String(item.id) !== String(ctx.id) && String(item[name]).toLowerCase() === String(value).toLowerCase());
    if (taken) return message(field, "unique");
  }
  return null;
}

// input: the body sent by the client (already merged with the stored record for PATCH).
export function validateRecord(resource, input, ctx) {
  const record = {};
  const fields = {};
  for (const [name, field] of Object.entries(resource.fields)) {
    let value = coerce(field, input?.[name]);
    if (value === null && field.default !== undefined && ctx.method === "POST") value = field.default;
    const error = checkField(name, field, value, ctx);
    if (error) fields[name] = error;
    record[name] = value;
  }
  // Domain rules run only when every field on its own is valid, so rules can rely on types.
  if (Object.keys(fields).length === 0) {
    for (const rule of resource.rules ?? []) {
      const found = rule(record, ctx);
      if (found) {
        for (const [name, text] of Object.entries(found)) {
          if (!fields[name]) fields[name] = text;
        }
      }
    }
  }
  return { record, fields: Object.keys(fields).length ? fields : null };
}
