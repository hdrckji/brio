import { notFound } from "next/navigation";
import { ClearCart } from "@/components/clear-cart";
import { db } from "@/lib/db";
import { fullOrderInclude } from "@/lib/emails";
import { formatPrice, formatSlot, PAYMENT_LABELS } from "@/lib/format";
import { markStripeOrderPaid } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { getStripe } from "@/lib/stripe";

export const metadata = { title: "Ma commande, Coukiz" };

const STATUS_TEXT = {
  AWAITING_PAYMENT: "en attente de la confirmation du paiement",
  CONFIRMED: "confirmée",
  READY: "prête, elle vous attend",
  PICKED_UP: "retirée",
  CANCELLED: "annulée",
} as const;

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
  const live = order.status !== "CANCELLED";
  const toPay = live && order.paymentStatus === "PENDING";

  return (
    <div className="mx-auto max-w-2xl">
      {justPlaced && order.status !== "AWAITING_PAYMENT" && live && <ClearCart />}

      <h1 className="pt-6 text-center font-display text-5xl leading-none sm:text-6xl">
        {!live ? "Commande annulée" : order.status === "AWAITING_PAYMENT" ? "Paiement en cours" : justPlaced ? "Merci !" : "Votre commande"}
      </h1>
      <p className="mt-4 text-center text-xl">
        Commande <strong>{order.reference}</strong> {STATUS_TEXT[order.status]}.
      </p>
      {justPlaced && order.status === "CONFIRMED" && (
        <p className="mt-1 text-center text-chocolat/75">Un email de confirmation a été envoyé à {order.email}.</p>
      )}
      {order.status === "AWAITING_PAYMENT" && (
        <p className="mt-1 text-center text-chocolat/75">Rechargez cette page dans quelques instants si le statut ne change pas.</p>
      )}

      <section className="mt-10 border-t border-cacao/40 pt-4">
        <h2 className="font-display text-3xl">Retrait</h2>
        <p className="mt-2 text-lg font-semibold first-letter:uppercase">{formatSlot(order.pickupSlot.startsAt, order.pickupSlot.endsAt)}</p>
        <p>{point.name}</p>
        <p className="text-chocolat/80">{point.address}</p>
        {point.details && <p className="mt-1 text-sm text-chocolat/75">{point.details}</p>}
      </section>

      {order.paymentMethod === "TRANSFER" && toPay && (
        <section className="mt-8 rounded-2xl border-2 border-dotted border-cacao/60 p-6">
          <h2 className="font-display text-3xl">Virement à effectuer</h2>
          <p className="mt-2">
            Virez <strong>{formatPrice(order.totalCents)}</strong> avant le retrait, avec la référence de commande en communication.
          </p>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
            <dt className="text-chocolat/75">Titulaire</dt>
            <dd>{settings.bankHolder}</dd>
            <dt className="text-chocolat/75">IBAN</dt>
            <dd className="select-all">{settings.bankIban}</dd>
            {settings.bankBic && (
              <>
                <dt className="text-chocolat/75">BIC</dt>
                <dd className="select-all">{settings.bankBic}</dd>
              </>
            )}
            <dt className="text-chocolat/75">Communication</dt>
            <dd className="font-bold select-all">{order.reference}</dd>
          </dl>
        </section>
      )}

      <section className="mt-8 border-t border-cacao/40 pt-4">
        <h2 className="font-display text-3xl">Détail</h2>
        <ul className="mt-3 space-y-2">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-end">
              <span>
                {i.quantity} × {i.productName}
              </span>
              <span className="leader" aria-hidden />
              <span>{formatPrice(i.quantity * i.unitPriceCents)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-end border-t border-cacao/40 pt-3 text-lg font-semibold">
          <span>Total</span>
          <span className="flex-1" />
          <span>{formatPrice(order.totalCents)}</span>
        </div>
        <p className="mt-3 text-chocolat/80">
          {order.paymentStatus === "PAID"
            ? `Payée (${PAYMENT_LABELS[order.paymentMethod].toLowerCase()}).`
            : order.paymentMethod === "CASH"
              ? "À régler en espèces au retrait."
              : order.paymentMethod === "TRANSFER"
                ? "Paiement par virement, en attente de réception."
                : "Paiement en attente."}
        </p>
      </section>
    </div>
  );
}
