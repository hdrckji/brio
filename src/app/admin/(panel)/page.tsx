import Link from "next/link";
import { PaymentBadge, StatusBadge } from "@/components/badges";
import { db } from "@/lib/db";
import { formatPrice, formatTime, localToDate, dayKey, formatDate } from "@/lib/format";
import { releaseAbandonedOrders } from "@/lib/orders";

export default async function Dashboard() {
  await releaseAbandonedOrders();
  const today = dayKey(new Date());
  const start = localToDate(today, "00:00");
  const end = new Date(start.getTime() + 2 * 86_400_000); // aujourd'hui + demain

  const [upcoming, pendingTransfers, totals] = await Promise.all([
    db.order.findMany({
      where: { status: { in: ["CONFIRMED", "READY"] }, pickupSlot: { startsAt: { gte: start, lt: end } } },
      include: { pickupSlot: { include: { pickupPoint: true } } },
      orderBy: { pickupSlot: { startsAt: "asc" } },
    }),
    db.order.count({ where: { paymentMethod: "TRANSFER", paymentStatus: "PENDING", status: { in: ["CONFIRMED", "READY"] } } }),
    db.order.aggregate({
      where: { status: { in: ["CONFIRMED", "READY", "PICKED_UP"] } },
      _count: true,
      _sum: { totalCents: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-bold">Tableau de bord</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="text-sm text-ink/60">Commandes (hors annulées)</div>
          <div className="text-3xl font-semibold">{totals._count}</div>
        </div>
        <div className="card">
          <div className="text-sm text-ink/60">Chiffre d&apos;affaires</div>
          <div className="text-3xl font-semibold">{formatPrice(totals._sum.totalCents ?? 0)}</div>
        </div>
        <Link href="/admin/commandes?paiement=TRANSFER_PENDING" className="card hover:border-berry">
          <div className="text-sm text-ink/60">Virements en attente</div>
          <div className="text-3xl font-semibold">{pendingTransfers}</div>
        </Link>
      </div>

      <section className="card">
        <h2 className="mb-3 font-serif text-xl font-semibold">Retraits aujourd&apos;hui et demain</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-ink/60">Aucun retrait prévu.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-ink/10">
              {upcoming.map((o) => (
                <tr key={o.id}>
                  <td className="py-2 first-letter:uppercase">
                    {formatDate(o.pickupSlot.startsAt)} {formatTime(o.pickupSlot.startsAt)}
                  </td>
                  <td className="py-2">{o.pickupSlot.pickupPoint.name}</td>
                  <td className="py-2">
                    <Link className="font-medium text-berry hover:underline" href={`/admin/commandes/${o.id}`}>
                      {o.reference}
                    </Link>{" "}
                    {o.customerName}
                  </td>
                  <td className="py-2"><StatusBadge status={o.status} /></td>
                  <td className="py-2"><PaymentBadge method={o.paymentMethod} status={o.paymentStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
