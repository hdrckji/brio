import { createHmac, timingSafeEqual } from "node:crypto";

// Signature et vérification du cookie de session admin.
// Module sans dépendance à Next : utilisé à la fois par les pages/actions (auth.ts) et par proxy.ts.

export const SESSION_COOKIE = "brio_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

let warned = false;

function secret() {
  const s = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("SESSION_SECRET ou ADMIN_PASSWORD doit être défini");
  if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production" && !warned) {
    warned = true;
    console.warn("SESSION_SECRET n'est pas défini : le mot de passe admin sert de clé de signature. Définissez SESSION_SECRET.");
  }
  return s;
}

export function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function createSessionValue() {
  const payload = `admin.${Date.now() + SESSION_MAX_AGE * 1000}`;
  return `${payload}.${sign(payload)}`;
}

export function isValidSessionValue(value: string | undefined | null) {
  if (!value) return false;
  const idx = value.lastIndexOf(".");
  const payload = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  if (!payload.startsWith("admin.") || !safeEqual(sig, sign(payload))) return false;
  return Number(payload.split(".")[1]) > Date.now();
}
