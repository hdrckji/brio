import { notFound } from "next/navigation";
import { ClearCart } from "@/components/clear-cart";
import { db } from "@/lib/db";
import { fullOrderInclude } from "@/lib/emails";
import { formatPrice, formatSlot, ORDER_STATUS_LABELS, PAYMENT_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/format";
import { markStripeOrderPaid } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { getStripe } from "@/lib/stripe";

export const metadata = { title: "Ma commande — Brio" };

export default async function OrderPage({ params, searchParams }: PageProps<"/commande/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  let order = await db.order.findUnique({ where: { id }, include: fullOrderInclude });
  if (!order) notFound();

  // Retour depuis Stripe : on vérifie le paiement sans attendre le webhook.
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : null;
  if (sessionId && order.stripeSessionId === sessionId && order.paymentStatus === "PENDING") {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid") {
        await markStripeOrderPaid(order.id, sessionId);
        order = await db.order.findUniqueOrThrow({ where: { id }, include: fullOrderInclude });
      }
    } catch (err) {
      console.error("Vérification Stripe", err);
    }
  }

  const settings = await getSettings();
  const justPlaced = Boolean(sp.nouvelle || sessionId);
  const point = order.pickupSlot.pickupPoint;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {justPlaced && order.status !== "AWAITING_PAYMENT" && order.status !== "CANCELLED" && <ClearCart />}
      <div className="text-center">
        <div className="text-5xl">{order.status === "CANCELLED" ? "✖" : "🎁"}</div>
        <h1 className="mt-2 font-serif text-3xl font-bold">
          {order.status === "AWAITING_PAYMENT"
            ? "Paiement en cours de validation"
            : order.status === "CANCELLED"
              ? "Commande annulée"
              : justPlaced
                ? "Merci pour votre commande !"
                : "Votre commande"}
        </h1>
        <p className="mt-2 text-ink/70">
          Référence <strong className="font-mono">{order.reference}</strong>
          {justPlaced && order.status === "CONFIRMED" && <> · un email de confirmation a été envoyé à {order.email}</>}
        </p>
      </div>

      {order.paymentMethod === "TRANSFER" && order.paymentStatus === "PENDING" && order.status !== "CANCELLED" && (
        <div className="card space-y-2 border-gold/40 bg-gold/10">
          <h2 className="font-semibold">Virement à effectuer</h2>
          <p className="text-sm">Merci de virer <strong>{formatPrice(order.totalCents)}</strong> avant le retrait :</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-sm">
            <dt>Titulaire</dt>
            <dd>{settings.bankHolder}</dd>
            <dt>IBAN</dt>
            <dd>{settings.bankIban}</dd>
            {settings.bankBic && (
              <>
                <dt>BIC</dt>
                <dd>{settings.bankBic}</dd>
              </>
            )}
            <dt>Communication</dt>
            <dd className="font-bold">{order.reference}</dd>
          </dl>
        </div>
      )}
      {order.paymentMethod === "CASH" && order.paymentStatus === "PENDING" && order.status !== "CANCELLED" && (
        <div className="card border-gold/40 bg-gold/10 text-sm">
          Vous réglerez <strong>{formatPrice(order.totalCents)}</strong> en espèces lors du retrait.
        </div>
      )}

      <div className="card space-y-4">
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <div className="text-ink/60">Retrait</div>
            <div className="font-semibold">{point.name}</div>
            <div>{point.address}</div>
            <div className="first-letter:uppercase">{formatSlot(order.pickupSlot.startsAt, order.pickupSlot.endsAt)}</div>
            {point.details && <div className="mt-1 text-ink/60">{point.details}</div>}
          </div>
          <div>
            <div className="text-ink/60">Statut</div>
            <div className="font-semibold">{ORDER_STATUS_LABELS[order.status]}</div>
            <div className="mt-2 text-ink/60">Paiement</div>
            <div>
              {PAYMENT_LABELS[order.paymentMethod]} · {PAYMENT_STATUS_LABELS[order.paymentStatus]}
            </div>
          </div>
        </div>
        <ul className="divide-y divide-ink/10 border-t border-ink/10 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between py-2">
              <span>
                {i.quantity} × {i.productName}
              </span>
              <span>{formatPrice(i.quantity * i.unitPriceCents)}</span>
            </li>
          ))}
          <li className="flex justify-between py-2 font-semibold">
            <span>Total</span>
            <span>{formatPrice(order.totalCents)}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
