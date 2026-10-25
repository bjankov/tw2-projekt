// Servisna radionica — devices, clients, work orders and the catalogue of services.
import { dateOrder, statusFlow } from "./src/rules.js";

const ORDER_STATUS = {
  received: "zaprimljen",
  "in-progress": "u izradi",
  done: "gotov",
  "picked-up": "preuzet",
  cancelled: "otkazan",
};
const OPEN = ["received", "in-progress", "done"];

const pickupDateRequired = (r) =>
  r.status === "picked-up" && !r.pickupAt ? { pickupAt: "Za preuzet nalog unesite datum preuzimanja." } : null;

// A device can have only one open work order at a time.
const oneOpenOrder = (r, ctx) => {
  if (!OPEN.includes(r.status)) return null;
  const open = ctx.db
    .all("work-orders")
    .some((o) => String(o.id) !== String(ctx.id) && o.deviceId === r.deviceId && OPEN.includes(o.status));
  return open ? { deviceId: "Uređaj već ima otvoren radni nalog." } : null;
};

export default {
  name: "Servisna radionica",
  defaults: { port: 4300, requireAuth: true },
  staffRole: "staff",
  defaultRole: "user",
  resources: {
    services: {
      fields: {
        name: { type: "string", required: true, minLength: 2, maxLength: 60, unique: true,
          messages: { required: "Unesite naziv usluge.", unique: "Usluga s tim nazivom već postoji." } },
        price: { type: "number", required: true, min: 0, max: 5000,
          messages: { required: "Unesite cijenu.", min: "Cijena ne može biti negativna." } },
      },
      permissions: { read: "public", create: "staff", update: "staff", delete: "staff" },
    },
    clients: {
      fields: {
        name: { type: "string", required: true, minLength: 2, maxLength: 80, messages: { required: "Unesite ime klijenta." } },
        email: { type: "string", required: true, pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", unique: true,
          messages: { required: "Unesite adresu e-pošte.", pattern: "Unesite ispravnu adresu e-pošte.",
            unique: "Klijent s tom adresom već postoji." } },
        phone: { type: "string", required: true, pattern: "^\\+?[0-9 ]{8,16}$",
          messages: { required: "Unesite broj telefona.", pattern: "Unesite ispravan broj telefona." } },
      },
      permissions: { read: "public", create: "user", update: "user", delete: "user" },
    },
    devices: {
      fields: {
        clientId: { type: "ref", to: "clients", required: true,
          restrictMessage: "Klijent ima uređaje i ne može se obrisati.",
          messages: { required: "Odaberite klijenta.", ref: "Odabrani klijent ne postoji." } },
        type: { type: "string", required: true, enum: ["laptop", "phone", "tablet", "desktop", "console"],
          messages: { required: "Odaberite vrstu uređaja.", enum: "Vrsta mora biti laptop, phone, tablet, desktop ili console." } },
        brand: { type: "string", required: true, minLength: 2, maxLength: 40, messages: { required: "Unesite proizvođača." } },
        model: { type: "string", required: true, minLength: 1, maxLength: 60, messages: { required: "Unesite model." } },
        serialNumber: { type: "string", required: true, pattern: "^[A-Z0-9]{8,14}$", unique: true,
          messages: { required: "Unesite serijski broj.", pattern: "Serijski broj sadrži 8 do 14 velikih slova i znamenaka.",
            unique: "Uređaj s tim serijskim brojem već postoji." } },
      },
      permissions: { read: "public", create: "user", update: "user", delete: "user" },
    },
    "work-orders": {
      fields: {
        orderNumber: { type: "string", required: true, pattern: "^RN-\\d{4}-\\d{4}$", unique: true,
          messages: { required: "Unesite broj naloga.", pattern: "Broj naloga mora biti u obliku RN-2026-0001.",
            unique: "Nalog s tim brojem već postoji." } },
        deviceId: { type: "ref", to: "devices", required: true, onDelete: "cascade",
          messages: { required: "Odaberite uređaj.", ref: "Odabrani uređaj ne postoji." } },
        serviceId: { type: "ref", to: "services", required: true,
          restrictMessage: "Usluga se upotrebljava u radnim nalozima i ne može se obrisati.",
          messages: { required: "Odaberite uslugu.", ref: "Odabrana usluga ne postoji." } },
        receivedAt: { type: "date", required: true, messages: { required: "Unesite datum zaprimanja." } },
        pickupAt: { type: "date" },
        status: { type: "string", enum: Object.keys(ORDER_STATUS), default: "received" },
        description: { type: "string", required: true, minLength: 5, maxLength: 500,
          messages: { required: "Opišite kvar.", minLength: "Opis mora imati najmanje 5 znakova." } },
      },
      rules: [
        dateOrder("receivedAt", "pickupAt", "Datum preuzimanja ne može biti prije datuma zaprimanja."),
        statusFlow(
          "status",
          { received: ["in-progress", "cancelled"], "in-progress": ["done", "cancelled"], done: ["picked-up"] },
          ORDER_STATUS,
          "received",
        ),
        pickupDateRequired,
        oneOpenOrder,
      ],
      permissions: { read: "public", create: "user", update: "user", delete: "user" },
    },
  },
};
