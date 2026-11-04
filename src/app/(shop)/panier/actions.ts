"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { itemLabel } from "@/lib/format";
import { createOrder, OrderError, STRIPE_HOLD_MINUTES } from "@/lib/orders";
import { enabledPaymentMethods, getSettings } from "@/lib/settings";
import { getStripe } from "@/lib/stripe";

const schema = z.object({
  customerName: z.string().trim().min(2, "Merci d'indiquer votre nom.").max(120),
  email: z.email("Adresse email invalide.").trim().max(200),
  phone: z.string().trim().min(6, "Merci d'indiquer un numéro de téléphone.").max(40),
  note: z.string().trim().max(1000).default(""),
  pickupSlotId: z.string().min(1, "Merci de choisir un créneau de retrait."),
  paymentMethod: z.enum(["STRIPE", "TRANSFER", "CASH"], "Merci de choisir un mode de paiement."),
  items: z
    .array(z.object({ productId: z.string().min(1), variantId: z.string().min(1).nullish(), quantity: z.number().int().min(1).max(99) }))
    .min(1, "Votre panier est vide."),
});

export type CheckoutState = { error?: string } | null;

async function baseUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "Panier invalide." };
  }
  const parsed = schema.safeParse({
    customerName: formData.get("customerName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    note: formData.get("note") ?? "",
    pickupSlotId: formData.get("pickupSlotId"),
    paymentMethod: formData.get("paymentMethod"),
    items,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const settings = await getSettings();
  if (!enabledPaymentMethods(settings).includes(parsed.data.paymentMethod))
    return { error: "Ce mode de paiement n'est pas disponible." };

  let order;
  try {
    order = await createOrder(parsed.data);
  } catch (err) {
    if (err instanceof OrderError) return { error: err.message };
    if (typeof err === "object" && err && "code" in err && err.code === "P2034")
      return { error: "Le créneau vient d'être très demandé, merci de réessayer." };
    console.error(err);
    return { error: "Une erreur est survenue, merci de réessayer." };
  }

  if (order.paymentMethod !== "STRIPE") redirect(`/commande/${order.id}?nouvelle=1`);

  const url = await baseUrl();
  let checkoutUrl: string;
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: order.email,
      client_reference_id: order.id,
      metadata: { orderId: order.id, reference: order.reference },
      line_items: order.items.map((i) => ({
        quantity: i.quantity,
        price_data: { currency: "eur", unit_amount: i.unitPriceCents, product_data: { name: itemLabel(i) } },
      })),
      expires_at: Math.floor(Date.now() / 1000) + (STRIPE_HOLD_MINUTES - 5) * 60,
      success_url: `${url}/commande/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${url}/panier?annule=1`,
    });
    await db.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
    checkoutUrl = session.url!;
  } catch (err) {
    console.error("Stripe", err);
    await db.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    return { error: "Le paiement en ligne est momentanément indisponible. Choisissez un autre mode de paiement." };
  }
  redirect(checkoutUrl);
}
