export const TIMEZONE = process.env.APP_TIMEZONE || "Europe/Paris";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function formatPrice(cents: number) {
  return eur.format(cents / 100);
}

export function formatDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

export function formatTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatSlot(startsAt: Date, endsAt: Date) {
  return `${formatDate(startsAt)}, de ${formatTime(startsAt)} à ${formatTime(endsAt)}`;
}

export function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIMEZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

/** "YYYY-MM-DD" de la date dans le fuseau de la boutique. */
export function dayKey(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(d);
}

/** Offset (ms) du fuseau de la boutique à un instant donné. */
function tzOffsetMs(at: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - at.getTime();
}

/** Convertit une date/heure locale ("YYYY-MM-DD", "HH:mm") du fuseau de la boutique en Date UTC. */
export function localToDate(day: string, time: string) {
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  let result = naive - tzOffsetMs(new Date(naive));
  // second passage pour les changements d'heure
  result = naive - tzOffsetMs(new Date(result));
  return new Date(result);
}

/** Valeur pour <input type="datetime-local"> / affichage HH:mm local. */
export function toLocalInput(d: Date) {
  const shifted = new Date(d.getTime() + tzOffsetMs(d));
  return shifted.toISOString().slice(0, 16);
}

export const PAYMENT_LABELS = {
  STRIPE: "Carte bancaire (en ligne)",
  TRANSFER: "Virement bancaire",
  CASH: "Espèces au retrait",
} as const;

export const PAYMENT_STATUS_LABELS = {
  PENDING: "En attente",
  PAID: "Payé",
  REFUNDED: "Remboursé",
} as const;

export const ORDER_STATUS_LABELS = {
  AWAITING_PAYMENT: "Paiement en cours",
  CONFIRMED: "Confirmée",
  READY: "Prête",
  PICKED_UP: "Retirée",
  CANCELLED: "Annulée",
} as const;

/** Libellé d'une ligne de commande : « Cougnou (chocolat) » ou « Stollen ». */
export function itemLabel(item: { productName: string; variantName?: string | null }) {
  return item.variantName ? `${item.productName} (${item.variantName})` : item.productName;
}
