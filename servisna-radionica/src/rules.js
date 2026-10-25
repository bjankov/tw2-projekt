// Reusable rules for domain.js. Each rule returns null or { field: message }.

export const dateOrder = (fromField, toField, text) => (r) =>
  r[fromField] && r[toField] && r[toField] < r[fromField] ? { [toField]: text } : null;

export const notInPast = (field, text) => (r, ctx) =>
  ctx.method === "POST" && r[field] && r[field] < ctx.today ? { [field]: text } : null;

// Allowed status changes, e.g. { pending: ["approved", "rejected"], approved: ["returned"] }.
export const statusFlow = (field, flow, labels, initial) => (r, ctx) => {
  const to = r[field];
  if (ctx.method === "POST") {
    return initial && to !== initial ? { [field]: `Novi zapis mora imati status „${labels[initial]}”.` } : null;
  }
  const from = ctx.existing?.[field];
  if (!from || from === to) return null;
  return (flow[from] ?? []).includes(to)
    ? null
    : { [field]: `Status se ne može promijeniti iz „${labels[from]}” u „${labels[to]}”.` };
};

const minutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// Two records overlap when they share the key and their [start, end) intervals intersect.
export function overlaps(a, b) {
  return a.start < b.end && b.start < a.end;
}

export const timeSlot = (dateField, timeField, durationOf) => (r) => ({
  date: r[dateField],
  start: minutes(r[timeField]),
  end: minutes(r[timeField]) + durationOf(r),
});

export { minutes };
