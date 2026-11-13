import "server-only";
import { randomInt } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { fullOrderInclude, sendOrderConfirmation, sendPaymentReceived } from "./emails";
import { dayKey, formatDate, formatTime } from "./format";
import { getSettings } from "./settings";

/** Durée pendant laquelle une commande Stripe non payée bloque ses places. */
export const STRIPE_HOLD_MINUTES = 40;

const ACTIVE_STATUSES = ["AWAITING_PAYMENT", "CONFIRMED", "READY", "PICKED_UP"] as const;

/**
 * Lignes de commande qui prennent de la place dans un créneau : tout sauf les produits
 * marqués hors limite (ex. truffes). Le réglage actuel du produit fait foi, y compris pour
 * les commandes déjà passées ; une ligne dont le produit a été supprimé compte.
 */
const COUNTED_ITEMS = { NOT: { product: { is: { countsInSlotLimit: false } } } } satisfies Prisma.OrderItemWhereInput;

/**
 * La capacité d'un créneau se compte en articles, pas en commandes : une commande de
 * 6 pièces prend 6 places. À inclure sur un créneau pour charger ce qui y est réservé.
 */
export const slotBookingsInclude = {
  orders: {
    where: { status: { in: [...ACTIVE_STATUSES] } },
    select: { items: { where: COUNTED_ITEMS, select: { quantity: true } } },
  },
} satisfies Prisma.PickupSlotInclude;

/** Nombre d'articles réservés sur un créneau chargé avec `slotBookingsInclude`. */
export function bookedArticles(slot: { orders: { items: { quantity: number }[] }[] }) {
  return slot.orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
}

export function generateReference() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[randomInt(alphabet.length)];
  return `BR-${s}`;
}

/** Annule les commandes Stripe abandonnées pour libérer les créneaux. */
export async function releaseAbandonedOrders() {
  await db.order.updateMany({
    where: {
      status: "AWAITING_PAYMENT",
      createdAt: { lt: new Date(Date.now() - STRIPE_HOLD_MINUTES * 60_000) },
    },
    data: { status: "CANCELLED" },
  });
}

/** Produits en vente qui ne comptent pas dans la limite d'articles d'un créneau. */
export async function getUncountedProductIds() {
  const products = await db.product.findMany({ where: { active: true, countsInSlotLimit: false }, select: { id: true } });
  return products.map((p) => p.id);
}

export async function getBookableSlots() {
  await releaseAbandonedOrders();
  const settings = await getSettings();
  const minStart = new Date(Date.now() + Number(settings.leadTimeHours || 24) * 3_600_000);
  const points = await db.pickupPoint.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      slots: {
        where: { active: true, startsAt: { gte: minStart } },
        orderBy: { startsAt: "asc" },
        include: slotBookingsInclude,
      },
    },
  });
  return points.map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address,
    details: p.details,
    slots: p.slots.map((s) => ({
      id: s.id,
      day: dayKey(s.startsAt),
      dayLabel: formatDate(s.startsAt),
      timeLabel: `${formatTime(s.startsAt)} – ${formatTime(s.endsAt)}`,
      // Places restantes, en articles
      remaining: Math.max(0, s.capacity - bookedArticles(s)),
    })),
  }));
}

export type CreateOrderInput = {
  customerName: string;
  email: string;
  phone: string;
  note: string;
  pickupSlotId: string;
  paymentMethod: "STRIPE" | "TRANSFER" | "CASH";
  items: { productId: string; variantId?: string | null; quantity: number }[];
};

export class OrderError extends Error {}

export async function createOrder(input: CreateOrderInput) {
  await releaseAbandonedOrders();
  const settings = await getSettings();
  if (settings.shopOpen !== "true") throw new OrderError("Les commandes sont actuellement fermées.");

  // Regroupe les lignes identiques (même produit et même déclinaison)
  const quantities = new Map<string, { productId: string; variantId: string | null; quantity: number }>();
  for (const it of input.items) {
    if (it.quantity <= 0) continue;
    const variantId = it.variantId || null;
    const key = `${it.productId}:${variantId ?? ""}`;
    const line = quantities.get(key) ?? { productId: it.productId, variantId, quantity: 0 };
    line.quantity += it.quantity;
    quantities.set(key, line);
  }
  if (quantities.size === 0) throw new OrderError("Votre panier est vide.");

  const productIds = [...new Set([...quantities.values()].map((l) => l.productId))];
  const products = await db.product.findMany({
    where: { id: { in: productIds }, active: true },
    include: { variants: { where: { active: true } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const items = [...quantities.values()].map((line) => {
    const product = byId.get(line.productId);
    if (!product) throw new OrderError("Un article de votre panier n'est plus disponible. Merci de vérifier votre panier.");
    let variant = null;
    if (product.variants.length > 0) {
      variant = product.variants.find((v) => v.id === line.variantId);
      if (!variant)
        throw new OrderError(`Le choix « ${product.name} » de votre panier n'est plus disponible. Retirez-le puis ajoutez-le à nouveau.`);
    } else if (line.variantId) {
      throw new OrderError(`« ${product.name} » a changé depuis votre ajout au panier. Retirez-le puis ajoutez-le à nouveau.`);
    }
    return {
      productId: product.id,
      productName: product.name,
      variantId: variant?.id ?? null,
      variantName: variant?.name ?? "",
      unitPriceCents: variant?.priceCents ?? product.priceCents,
      quantity: line.quantity,
    };
  });
  const totalCents = items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
  // Places prises dans le créneau : les produits hors limite (ex. truffes) n'en prennent pas.
  const articles = items.reduce((sum, i) => sum + (byId.get(i.productId)?.countsInSlotLimit === false ? 0 : i.quantity), 0);
  const minStart = new Date(Date.now() + Number(settings.leadTimeHours || 24) * 3_600_000);

  // Transaction sérialisable : deux clients ne peuvent pas prendre les dernières places en même temps.
  const order = await db.$transaction(
    async (tx) => {
      const slot = await tx.pickupSlot.findUnique({
        where: { id: input.pickupSlotId },
        include: { pickupPoint: true },
      });
      if (!slot || !slot.active || !slot.pickupPoint.active)
        throw new OrderError("Ce créneau de retrait n'est pas disponible.");
      if (slot.startsAt < minStart)
        throw new OrderError(`Les commandes doivent être passées au moins ${settings.leadTimeHours} h avant le retrait.`);
      const booked = await tx.orderItem.aggregate({
        _sum: { quantity: true },
        where: { ...COUNTED_ITEMS, order: { pickupSlotId: slot.id, status: { in: [...ACTIVE_STATUSES] } } },
      });
      const remaining = Math.max(0, slot.capacity - (booked._sum.quantity ?? 0));
      // Une commande faite uniquement de produits hors limite passe même sur un créneau complet.
      if (articles > remaining)
        throw new OrderError(
          remaining === 0
            ? "Ce créneau est complet, merci d'en choisir un autre."
            : `Ce créneau n'a plus assez de place pour votre commande (il reste ${remaining} place${remaining > 1 ? "s" : ""}). Merci d'en choisir un autre.`,
        );

      return tx.order.create({
        data: {
          reference: generateReference(),
          customerName: input.customerName,
          email: input.email,
          phone: input.phone,
          note: input.note,
          pickupSlotId: slot.id,
          paymentMethod: input.paymentMethod,
          status: input.paymentMethod === "STRIPE" ? "AWAITING_PAYMENT" : "CONFIRMED",
          totalCents,
          items: { create: items },
        },
        include: fullOrderInclude,
      });
    },
    { isolationLevel: "Serializable" },
  );

  if (order.status === "CONFIRMED") await sendOrderConfirmation(order);
  return order;
}

/** Idempotent : appelé par le webhook Stripe et par la page de retour. */
export async function markStripeOrderPaid(orderId: string, sessionId: string) {
  const updated = await db.order.updateMany({
    where: { id: orderId, stripeSessionId: sessionId, paymentStatus: "PENDING" },
    data: { paymentStatus: "PAID" },
  });
  if (updated.count === 0) return;
  // Si la commande avait été libérée entre-temps, on la réactive : le client a payé.
  await db.order.updateMany({
    where: { id: orderId, status: { in: ["AWAITING_PAYMENT", "CANCELLED"] } },
    data: { status: "CONFIRMED" },
  });
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: fullOrderInclude });
  await sendOrderConfirmation(order);
}

export async function markOrderPaidManually(orderId: string) {
  const updated = await db.order.updateMany({
    where: { id: orderId, paymentStatus: "PENDING" },
    data: { paymentStatus: "PAID" },
  });
  if (updated.count === 0) return;
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: fullOrderInclude });
  if (order.paymentMethod === "TRANSFER") await sendPaymentReceived(order);
}
