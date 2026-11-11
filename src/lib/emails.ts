import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { deliverEmail, sendEmail } from "./email";
import { PAYMENT_LABELS, formatPrice, formatSlot, itemLabel } from "./format";
import { getSettings, type Settings } from "./settings";

export type FullOrder = Prisma.OrderGetPayload<{ include: { items: true; pickupSlot: { include: { pickupPoint: true } } } }>;

export const fullOrderInclude = { items: true, pickupSlot: { include: { pickupPoint: true } } } as const;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function siteUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function layout(settings: Settings, title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#fbefe3;font-family:Arial,Helvetica,sans-serif;color:#5c3122">
<div style="max-width:560px;margin:0 auto;padding:24px">
<h1 style="font-size:28px;color:#5c3122;font-family:Georgia,serif;margin:0 0 4px">${esc(settings.shopName)}</h1>
<div style="background:#fff;border-radius:8px;padding:24px;margin-top:16px">
<h2 style="font-size:18px;margin:0 0 16px">${title}</h2>
${body}
</div></div></body></html>`;
}

function summary(order: FullOrder) {
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:4px 0">${i.quantity} × ${esc(itemLabel(i))}</td><td style="padding:4px 0;text-align:right">${formatPrice(i.unitPriceCents * i.quantity)}</td></tr>`,
    )
    .join("");
  const point = order.pickupSlot.pickupPoint;
  return `
<p style="margin:0 0 8px"><strong>Référence :</strong> ${order.reference}</p>
<table style="width:100%;border-collapse:collapse;margin:12px 0">${rows}
<tr><td style="padding:8px 0;border-top:1px solid #ddd"><strong>Total</strong></td><td style="padding:8px 0;border-top:1px solid #ddd;text-align:right"><strong>${formatPrice(order.totalCents)}</strong></td></tr></table>
<p style="margin:16px 0 4px"><strong>Retrait :</strong> ${esc(point.name)}</p>
<p style="margin:0 0 4px">${esc(point.address)}</p>
<p style="margin:0 0 4px">${formatSlot(order.pickupSlot.startsAt, order.pickupSlot.endsAt)}</p>
${point.details ? `<p style="margin:0 0 4px;color:#666">${esc(point.details)}</p>` : ""}
<p style="margin:16px 0 4px"><strong>Paiement :</strong> ${PAYMENT_LABELS[order.paymentMethod]}</p>`;
}

function paymentInstructions(order: FullOrder, s: Settings) {
  if (order.paymentMethod === "STRIPE") return `<p>Votre paiement a bien été reçu. Merci !</p>`;
  if (order.paymentMethod === "CASH")
    return `<p>Vous réglerez <strong>${formatPrice(order.totalCents)}</strong> en espèces lors du retrait.</p>`;
  return `<p>Merci d'effectuer un virement de <strong>${formatPrice(order.totalCents)}</strong> avant le retrait :</p>
<p style="background:#fbefe3;padding:12px;border-radius:6px;font-family:monospace">
Titulaire : ${esc(s.bankHolder)}<br>IBAN : ${esc(s.bankIban)}<br>${s.bankBic ? `BIC : ${esc(s.bankBic)}<br>` : ""}Communication : <strong>${order.reference}</strong></p>`;
}

function confirmationBody(order: FullOrder, s: Settings) {
  return `<p>Bonjour ${esc(order.customerName)},</p><p>Merci pour votre commande ! Voici le récapitulatif.</p>
${summary(order)}${paymentInstructions(order, s)}
<p>Votre commande sera préparée le jour même du retrait, pour une fraîcheur maximale.${s.conservation ? ` ${esc(s.conservation)}` : ""}</p>
<p><a href="${siteUrl()}/commande/${order.id}" style="color:#5c3122">Voir ma commande</a></p>`;
}

export async function sendOrderConfirmation(order: FullOrder) {
  const s = await getSettings();
  const body = confirmationBody(order, s);
  await sendEmail(order.email, `Commande ${order.reference} confirmée`, layout(s, "Commande confirmée", body));

  if (s.notifyEmail) {
    const adminBody = `<p>Nouvelle commande de <strong>${esc(order.customerName)}</strong> (${esc(order.email)}, ${esc(order.phone)}).</p>
${order.note ? `<p><em>Note : ${esc(order.note)}</em></p>` : ""}${summary(order)}
<p><a href="${siteUrl()}/admin/commandes/${order.id}">Ouvrir dans l'admin</a></p>`;
    await sendEmail(s.notifyEmail, `Nouvelle commande ${order.reference}`, layout(s, "Nouvelle commande", adminBody));
  }
}

export async function sendPaymentReceived(order: FullOrder) {
  const s = await getSettings();
  const body = `<p>Bonjour ${esc(order.customerName)},</p><p>Nous avons bien reçu votre paiement pour la commande <strong>${order.reference}</strong>. À bientôt !</p>${summary(order)}`;
  await sendEmail(order.email, `Paiement reçu — commande ${order.reference}`, layout(s, "Paiement reçu", body));
}

export async function sendOrderReady(order: FullOrder) {
  const s = await getSettings();
  const body = `<p>Bonjour ${esc(order.customerName)},</p><p>Votre commande <strong>${order.reference}</strong> est prête et vous attend.</p>${summary(order)}`;
  await sendEmail(order.email, `Votre commande ${order.reference} est prête`, layout(s, "Commande prête", body));
}

export async function sendOrderCancelled(order: FullOrder) {
  const s = await getSettings();
  const body = `<p>Bonjour ${esc(order.customerName)},</p><p>Votre commande <strong>${order.reference}</strong> a été annulée. N'hésitez pas à nous contacter pour toute question.</p>`;
  await sendEmail(order.email, `Commande ${order.reference} annulée`, layout(s, "Commande annulée", body));
}

/** Mail test depuis l'admin : la vraie confirmation de commande, avec une commande fictive. Lève l'erreur SMTP. */
export async function sendTestEmail(to: string) {
  const s = await getSettings();
  const start = new Date(Date.now() + 2 * 86_400_000);
  start.setHours(10, 0, 0, 0);
  const order = {
    id: "test",
    reference: "TEST",
    customerName: "Client test",
    email: to,
    paymentMethod: "TRANSFER",
    totalCents: 2350,
    items: [
      { quantity: 2, productName: "Produit exemple", variantName: "", unitPriceCents: 850 },
      { quantity: 1, productName: "Autre produit", variantName: "Grand", unitPriceCents: 650 },
    ],
    pickupSlot: {
      startsAt: start,
      endsAt: new Date(start.getTime() + 2 * 3_600_000),
      pickupPoint: { name: "Point de retrait exemple", address: "1 rue de l'Exemple", details: "" },
    },
  } as unknown as FullOrder;
  const body = `<p style="background:#fff4d6;padding:8px 12px;border-radius:6px;font-size:13px">Ceci est un email de test envoyé depuis l'admin. La commande ci-dessous est fictive.</p>
${confirmationBody(order, s)}
<p style="margin-top:24px;font-size:12px;color:#888">Liens du site : ${esc(siteUrl())}</p>`;
  await deliverEmail(to, `[TEST] Commande ${order.reference} confirmée`, layout(s, "Commande confirmée", body));
}
