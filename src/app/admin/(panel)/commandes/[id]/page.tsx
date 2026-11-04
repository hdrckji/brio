import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton, SubmitButton } from "@/components/action-form";
import { PaymentBadge, StatusBadge } from "@/components/badges";
import { db } from "@/lib/db";
import { fullOrderInclude } from "@/lib/emails";
import { formatDateTime, formatPrice, formatSlot, PAYMENT_LABELS } from "@/lib/format";
import { markPaid, markPickedUpAndPaid, setOrderStatus } from "../../../actions";

export default async function OrderDetail({ params }: PageProps<"/admin/commandes/[id]">) {
  const { id } = await params;
  const order = await db.order.findUnique({ where: { id }, include: fullOrderInclude });
  if (!order) notFound();
  const point = order.pickupSlot.pickupPoint;
  const active = order.status !== "CANCELLED" && order.status !== "AWAITING_PAYMENT";

  return (
    <div className="space-y-6">
      <Link href="/admin/commandes" className="text-sm text-sapin/75 hover:text-sapin">Toutes les commandes</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-5xl leading-none">{order.reference}</h1>
        <StatusBadge status={order.status} />
        <PaymentBadge method={order.paymentMethod} status={order.paymentStatus} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="card grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <h2 className="mb-1 font-semibold">Client</h2>
              <div>{order.customerName}</div>
              <a className="text-airelle hover:underline" href={`mailto:${order.email}`}>{order.email}</a>
              <div><a href={`tel:${order.phone}`}>{order.phone}</a></div>
              {order.note && <p className="mt-2 rounded bg-givre p-2 italic">{order.note}</p>}
            </div>
            <div>
              <h2 className="mb-1 font-semibold">Retrait</h2>
              <div>{point.name}</div>
              <div className="text-sapin/75">{point.address}</div>
              <div className="first-letter:uppercase">{formatSlot(order.pickupSlot.startsAt, order.pickupSlot.endsAt)}</div>
              <h2 className="mb-1 mt-3 font-semibold">Paiement</h2>
              <div>{PAYMENT_LABELS[order.paymentMethod]}</div>
              <div className="text-xs text-sapin/75">Commande passée le {formatDateTime(order.createdAt)}</div>
            </div>
          </section>

          <section className="card">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-sapin/10">
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2">{i.quantity} ×</td>
                    <td className="py-2">{i.productName}</td>
                    <td className="py-2 text-right text-sapin/75">{formatPrice(i.unitPriceCents)}</td>
                    <td className="py-2 text-right">{formatPrice(i.unitPriceCents * i.quantity)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td colSpan={3} className="py-2">Total</td>
                  <td className="py-2 text-right">{formatPrice(order.totalCents)}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        <aside className="card h-fit space-y-4">
          <h2 className="font-semibold">Actions</h2>
          {order.status === "AWAITING_PAYMENT" && (
            <p className="text-sm text-sapin/75">Le client est en train de payer par carte. La commande sera confirmée automatiquement, ou annulée si le paiement n&apos;aboutit pas.</p>
          )}
          {active && order.paymentStatus === "PENDING" && (
            <form action={markPaid}>
              <input type="hidden" name="id" value={order.id} />
              <SubmitButton className="btn w-full">
                Marquer comme payée{order.paymentMethod === "TRANSFER" ? " (email au client)" : ""}
              </SubmitButton>
            </form>
          )}
          {order.status === "CONFIRMED" && (
            <form action={setOrderStatus} className="space-y-2">
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="status" value="READY" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="notify" defaultChecked className="accent-airelle" /> Prévenir le client par email
              </label>
              <SubmitButton className="btn-secondary w-full">Marquer comme prête</SubmitButton>
            </form>
          )}
          {(order.status === "CONFIRMED" || order.status === "READY") && (
            <form action={order.paymentStatus === "PENDING" ? markPickedUpAndPaid : setOrderStatus}>
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="status" value="PICKED_UP" />
              <SubmitButton className="btn-secondary w-full">
                {order.paymentStatus === "PENDING" ? "Retirée et payée" : "Marquer comme retirée"}
              </SubmitButton>
            </form>
          )}
          {order.status === "PICKED_UP" && (
            <form action={setOrderStatus}>
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="status" value="READY" />
              <SubmitButton className="btn-secondary w-full">Annuler le retrait</SubmitButton>
            </form>
          )}
          {order.status !== "CANCELLED" && order.status !== "PICKED_UP" && order.status !== "AWAITING_PAYMENT" && (
            <form action={setOrderStatus} className="space-y-2 border-t border-sapin/10 pt-4">
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="status" value="CANCELLED" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="notify" defaultChecked className="accent-airelle" /> Prévenir le client par email
              </label>
              <ConfirmButton message="Annuler cette commande ? Le créneau sera libéré." className="btn-danger w-full">
                Annuler la commande
              </ConfirmButton>
              {order.paymentStatus === "PAID" && order.paymentMethod === "STRIPE" && (
                <p className="text-xs text-sapin/75">Pensez à rembourser le client depuis le tableau de bord Stripe.</p>
              )}
            </form>
          )}
          {order.status === "CANCELLED" && (
            <form action={setOrderStatus}>
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="status" value="CONFIRMED" />
              <SubmitButton className="btn-secondary w-full">Réactiver la commande</SubmitButton>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
