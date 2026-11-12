import "server-only";
import { headers } from "next/headers";

// Limiteur en mémoire (fenêtre fixe). Suffisant pour une instance unique ;
// les compteurs repartent de zéro à chaque redéploiement.

type Bucket = { count: number; resetAt: number };

const globalForLimits = globalThis as unknown as { brioRateLimits?: Map<string, Bucket> };
const buckets = (globalForLimits.brioRateLimits ??= new Map<string, Bucket>());

function current(key: string, now: number) {
  const b = buckets.get(key);
  if (b && b.resetAt > now) return b;
  if (b) buckets.delete(key);
  return null;
}

/** Secondes à attendre si la limite est atteinte, sinon 0. Ne compte rien. */
export function retryAfter(key: string, limit: number) {
  const now = Date.now();
  const b = current(key, now);
  return b && b.count >= limit ? Math.ceil((b.resetAt - now) / 1000) : 0;
}

/** Compte un événement pour cette clé. */
export function record(key: string, windowMs: number) {
  const now = Date.now();
  const b = current(key, now);
  if (b) b.count++;
  else buckets.set(key, { count: 1, resetAt: now + windowMs });
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }
}

export function reset(key: string) {
  buckets.delete(key);
}

/** IP du visiteur. X-Real-IP est posé par l'hébergeur (Railway) et n'est pas falsifiable par le client. */
export async function clientIp() {
  const h = await headers();
  return h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",").pop()?.trim() || "inconnue";
}

export function waitLabel(seconds: number) {
  return seconds < 90 ? "une minute" : `${Math.ceil(seconds / 60)} minutes`;
}
