"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { OrderStatus } from "@/generated/prisma/client";
import { checkPassword, createSession, destroySession, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fullOrderInclude, sendOrderCancelled, sendOrderReady, sendTestEmail } from "@/lib/emails";
import { localToDate } from "@/lib/format";
import { sniffImageMime } from "@/lib/images";
import { markOrderPaidManually } from "@/lib/orders";
import { clientIp, record, reset, retryAfter, waitLabel } from "@/lib/rate-limit";
import { saveSettings, SETTING_DEFAULTS, type SettingKey } from "@/lib/settings";

export type FormState = { error?: string; ok?: string } | null;

/* ---------- Authentification ---------- */

// Échecs de connexion tolérés par fenêtre de 15 minutes : par adresse IP, et au total
// (le plafond global borne une attaque répartie sur de nombreuses adresses).
const LOGIN_WINDOW_MS = 15 * 60_000;
const LOGIN_MAX_PER_IP = 5;
const LOGIN_MAX_GLOBAL = 100;

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!process.env.ADMIN_PASSWORD) return { error: "ADMIN_PASSWORD n'est pas configuré sur le serveur." };
  const ipKey = `login:ip:${await clientIp()}`;
  const wait = Math.max(retryAfter(ipKey, LOGIN_MAX_PER_IP), retryAfter("login:global", LOGIN_MAX_GLOBAL));
  if (wait > 0) return { error: `Trop de tentatives. Réessayez dans ${waitLabel(wait)}.` };
  if (!checkPassword(String(formData.get("password") ?? ""))) {
    record(ipKey, LOGIN_WINDOW_MS);
    record("login:global", LOGIN_WINDOW_MS);
    return { error: "Mot de passe incorrect." };
  }
  reset(ipKey);
  await createSession();
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

/* ---------- Produits ---------- */

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function parsePrice(raw: FormDataEntryValue | string | null) {
  const n = Number(String(raw ?? "").replace(",", ".").trim());
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

export async function saveProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const priceCents = parsePrice(formData.get("price"));
  if (!name) return { error: "Le nom est obligatoire." };
  if (priceCents === null) return { error: "Prix invalide." };

  const data: {
    name: string;
    description: string;
    priceCents: number;
    sortOrder: number;
    active: boolean;
    countsInSlotLimit: boolean;
    imageData?: Uint8Array<ArrayBuffer> | null;
    imageMime?: string | null;
    imageVersion?: { increment: number };
  } = {
    name,
    priceCents,
    description: String(formData.get("description") ?? "").trim(),
    sortOrder: Number(formData.get("sortOrder") || 0) || 0,
    active: formData.get("active") === "on",
    countsInSlotLimit: formData.get("countsInSlotLimit") === "on",
  };

  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    if (image.size > MAX_IMAGE_BYTES) return { error: "Image trop lourde (5 Mo max)." };
    const bytes = new Uint8Array(await image.arrayBuffer());
    // Le type est déduit du contenu : celui annoncé par le navigateur n'est pas fiable (un SVG peut contenir du script).
    const mime = sniffImageMime(bytes);
    if (!mime) return { error: "Format non pris en charge : utilisez une photo JPG, PNG, WebP, GIF ou AVIF." };
    data.imageData = bytes;
    data.imageMime = mime;
    data.imageVersion = { increment: 1 };
  } else if (formData.get("removeImage") === "on") {
    data.imageData = null;
    data.imageMime = null;
    data.imageVersion = { increment: 1 };
  }

  // Déclinaisons (goûts) : envoyées en JSON par l'éditeur
  let variants: { id?: string; name: string; priceCents: number | null; active: boolean; sortOrder: number }[];
  try {
    const raw = z
      .array(z.object({ id: z.string().optional(), name: z.string(), price: z.string(), active: z.boolean() }))
      .parse(JSON.parse(String(formData.get("variants") || "[]")));
    variants = [];
    for (const [i, v] of raw.entries()) {
      const name = v.name.trim();
      if (!name) continue;
      let variantPrice: number | null = null;
      if (v.price.trim()) {
        variantPrice = parsePrice(v.price);
        if (variantPrice === null) return { error: `Prix invalide pour le goût « ${name} ».` };
      }
      variants.push({ id: v.id, name, priceCents: variantPrice, active: v.active, sortOrder: i });
    }
  } catch {
    return { error: "Liste des goûts invalide." };
  }
  if (new Set(variants.map((v) => v.name.toLowerCase())).size !== variants.length)
    return { error: "Deux goûts portent le même nom." };

  await db.$transaction(async (tx) => {
    const product = id
      ? await tx.product.update({ where: { id }, data })
      : await tx.product.create({ data: { ...data, imageVersion: data.imageData ? 1 : 0 } });
    const keep = variants.filter((v) => v.id).map((v) => v.id!);
    // Les goûts retirés sont supprimés ; les commandes passées gardent leur nom (variantName).
    await tx.productVariant.deleteMany({ where: { productId: product.id, id: { notIn: keep } } });
    for (const v of variants) {
      const values = { name: v.name, priceCents: v.priceCents, active: v.active, sortOrder: v.sortOrder };
      if (v.id) await tx.productVariant.update({ where: { id: v.id, productId: product.id }, data: values });
      else await tx.productVariant.create({ data: { ...values, productId: product.id } });
    }
  });

  revalidatePath("/", "layout");
  redirect("/admin/produits");
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  // Les lignes de commande gardent le nom et le prix ; le lien produit passe à null.
  await db.product.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/admin/produits");
}

/* ---------- Points de retrait ---------- */

export async function savePickupPoint(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const data = {
    name: String(formData.get("name") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    details: String(formData.get("details") ?? "").trim(),
    sortOrder: Number(formData.get("sortOrder") || 0) || 0,
    active: formData.get("active") === "on",
  };
  if (!data.name || !data.address) return { error: "Nom et adresse sont obligatoires." };
  if (id) {
    await db.pickupPoint.update({ where: { id }, data });
    revalidatePath(`/admin/points/${id}`);
    return { ok: "Point de retrait enregistré." };
  }
  const created = await db.pickupPoint.create({ data });
  redirect(`/admin/points/${created.id}`);
}

export async function deletePickupPoint(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const orders = await db.order.count({ where: { pickupSlot: { pickupPointId: id } } });
  if (orders > 0) {
    // On ne supprime pas l'historique : on désactive.
    await db.pickupPoint.update({ where: { id }, data: { active: false } });
  } else {
    await db.pickupPoint.delete({ where: { id } });
  }
  redirect("/admin/points");
}

const slotGenSchema = z.object({
  pickupPointId: z.string().min(1),
  fromDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de début invalide."),
  toDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de fin invalide."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure de début invalide."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure de fin invalide."),
  duration: z.coerce.number().int().min(5, "Durée minimum : 5 minutes.").max(24 * 60),
  capacity: z.coerce.number().int().min(1, "Capacité minimum : 1 article."),
  weekdays: z.array(z.coerce.number().int().min(0).max(6)).min(1, "Choisissez au moins un jour."),
});

export async function generateSlots(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = slotGenSchema.safeParse({
    pickupPointId: formData.get("pickupPointId"),
    fromDay: formData.get("fromDay"),
    toDay: formData.get("toDay") || formData.get("fromDay"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    duration: formData.get("duration"),
    capacity: formData.get("capacity"),
    weekdays: formData.getAll("weekdays"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const v = parsed.data;
  if (v.toDay < v.fromDay) return { error: "La date de fin est avant la date de début." };
  if (v.endTime <= v.startTime) return { error: "L'heure de fin doit être après l'heure de début." };

  const slots: { pickupPointId: string; startsAt: Date; endsAt: Date; capacity: number }[] = [];
  const day = new Date(`${v.fromDay}T12:00:00Z`);
  const last = new Date(`${v.toDay}T12:00:00Z`);
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  for (; day <= last; day.setUTCDate(day.getUTCDate() + 1)) {
    if (!v.weekdays.includes(day.getUTCDay())) continue;
    const d = day.toISOString().slice(0, 10);
    for (let m = toMin(v.startTime); m + v.duration <= toMin(v.endTime); m += v.duration) {
      slots.push({
        pickupPointId: v.pickupPointId,
        startsAt: localToDate(d, fmt(m)),
        endsAt: localToDate(d, fmt(m + v.duration)),
        capacity: v.capacity,
      });
    }
    if (slots.length > 2000) return { error: "Trop de créneaux d'un coup (max 2000)." };
  }
  if (slots.length === 0) return { error: "Aucun créneau généré avec ces paramètres." };

  // Évite les doublons exacts déjà existants
  const existing = await db.pickupSlot.findMany({
    where: { pickupPointId: v.pickupPointId, startsAt: { in: slots.map((s) => s.startsAt) } },
    select: { startsAt: true },
  });
  const taken = new Set(existing.map((e) => e.startsAt.getTime()));
  const fresh = slots.filter((s) => !taken.has(s.startsAt.getTime()));
  await db.pickupSlot.createMany({ data: fresh });
  revalidatePath(`/admin/points/${v.pickupPointId}`);
  return { ok: `${fresh.length} créneau(x) créé(s)${fresh.length < slots.length ? `, ${slots.length - fresh.length} doublon(s) ignoré(s)` : ""}.` };
}

export async function updateSlot(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const capacity = Number(formData.get("capacity"));
  const active = formData.get("active") === "on";
  const slot = await db.pickupSlot.update({
    where: { id },
    data: { ...(Number.isInteger(capacity) && capacity >= 0 ? { capacity } : {}), active },
  });
  revalidatePath(`/admin/points/${slot.pickupPointId}`);
}

/** Applique la même capacité (en articles) à tous les créneaux à venir d'un point de retrait. */
export async function setUpcomingSlotsCapacity(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const pickupPointId = String(formData.get("pickupPointId") ?? "");
  if (!pickupPointId) return { error: "Point de retrait manquant." };
  const capacity = z.coerce.number().int().min(1).max(100_000).safeParse(formData.get("capacity"));
  if (!capacity.success) return { error: "Indiquez un nombre d'articles (minimum 1)." };
  const updated = await db.pickupSlot.updateMany({
    where: { pickupPointId, endsAt: { gte: new Date() } },
    data: { capacity: capacity.data },
  });
  revalidatePath(`/admin/points/${pickupPointId}`);
  return { ok: `${updated.count} créneau(x) à venir passé(s) à ${capacity.data} articles max.` };
}

export async function deleteSlot(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const slot = await db.pickupSlot.findUniqueOrThrow({ where: { id }, include: { _count: { select: { orders: true } } } });
  if (slot._count.orders > 0) await db.pickupSlot.update({ where: { id }, data: { active: false } });
  else await db.pickupSlot.delete({ where: { id } });
  revalidatePath(`/admin/points/${slot.pickupPointId}`);
}

export async function deleteAllSlots(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const pickupPointId = String(formData.get("pickupPointId") ?? "");
  if (!pickupPointId) return { error: "Point de retrait manquant." };
  // Comme pour un créneau seul : ceux qui ont des commandes (même annulées) sont fermés, pas supprimés.
  const [deleted, , kept] = await db.$transaction([
    db.pickupSlot.deleteMany({ where: { pickupPointId, orders: { none: {} } } }),
    db.pickupSlot.updateMany({ where: { pickupPointId }, data: { active: false } }),
    db.pickupSlot.count({ where: { pickupPointId } }),
  ]);
  revalidatePath(`/admin/points/${pickupPointId}`);
  return {
    ok: `${deleted.count} créneau(x) supprimé(s).${kept > 0 ? ` ${kept} créneau(x) avec des commandes conservé(s) et fermé(s).` : ""}`,
  };
}

/* ---------- Commandes ---------- */

export async function setOrderStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as OrderStatus;
  const notify = formData.get("notify") === "on";
  if (!["CONFIRMED", "READY", "PICKED_UP", "CANCELLED"].includes(status)) return;
  const order = await db.order.update({ where: { id }, data: { status }, include: fullOrderInclude });
  if (notify && status === "READY") await sendOrderReady(order);
  if (notify && status === "CANCELLED") await sendOrderCancelled(order);
  revalidatePath(`/admin/commandes/${id}`);
}

export async function markPaid(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  await markOrderPaidManually(id);
  revalidatePath(`/admin/commandes/${id}`);
}

export async function markPickedUpAndPaid(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  await db.order.update({ where: { id }, data: { status: "PICKED_UP", paymentStatus: "PAID" } });
  revalidatePath(`/admin/commandes/${id}`);
}

/* ---------- Paramètres ---------- */

const BOOL_KEYS: SettingKey[] = ["shopOpen", "paymentStripe", "paymentTransfer", "paymentCash"];

export async function updateSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const values: Partial<Record<SettingKey, string>> = {};
  for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
    if (BOOL_KEYS.includes(key)) values[key] = formData.get(key) === "on" ? "true" : "false";
    else values[key] = String(formData.get(key) ?? "").trim();
  }
  const lead = Number(values.leadTimeHours);
  if (!Number.isFinite(lead) || lead < 0) return { error: "Délai minimum invalide." };
  if (!values.shopName) return { error: "Le nom de la boutique est obligatoire." };
  await saveSettings(values);
  revalidatePath("/", "layout");
  return { ok: "Paramètres enregistrés." };
}

export async function sendTestEmailAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const to = String(formData.get("testEmail") ?? "").trim();
  if (!z.email().safeParse(to).success) return { error: "Adresse email invalide." };
  try {
    await sendTestEmail(to);
  } catch (err) {
    console.error("Échec du mail test", err);
    return { error: `Échec de l'envoi : ${err instanceof Error ? err.message : String(err)}` };
  }
  return { ok: `Email de test envoyé à ${to}. Pense à regarder dans les spams.` };
}
