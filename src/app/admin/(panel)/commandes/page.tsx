import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { PaymentBadge, StatusBadge } from "@/components/badges";
import { db } from "@/lib/db";
import { formatDateTime, formatPrice, localToDate, ORDER_STATUS_LABELS } from "@/lib/format";
import { releaseAbandonedOrders } from "@/lib/orders";

export default async function OrdersPage({ searchParams }: PageProps<"/admin/commandes">) {
  await releaseAbandonedOrders();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const status = str("statut");
  const point = str("point");
  const day = str("jour");
  const q = str("q");
  const paiement = str("paiement");

  const where: Prisma.OrderWhereInput = {};
  if (status && status in ORDER_STATUS_LABELS) where.status = status as keyof typeof ORDER_STATUS_LABELS;
  else if (status !== "ALL") where.status = { not: "CANCELLED" };
  const slotFilter: Prisma.PickupSlotWhereInput = {};
  if (point) slotFilter.pickupPointId = point;
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const start = localToDate(day, "00:00");
    slotFilter.startsAt = { gte: start, lt: new Date(start.getTime() + 86_400_000) };
  }
  if (Object.keys(slotFilter).length) where.pickupSlot = slotFilter;
  if (paiement === "TRANSFER_PENDING") Object.assign(where, { paymentMethod: "TRANSFER", paymentStatus: "PENDING" });
  if (q)
    where.OR = [
      { reference: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];

  const [orders, points] = await Promise.all([
    db.order.findMany({
      where,
      include: { pickupSlot: { include: { pickupPoint: true } }, items: true },
      orderBy: { pickupSlot: { startsAt: "asc" } },
      take: 500,
    }),
    db.pickupPoint.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-5xl leading-none">Commandes</h1>
      <form className="card flex flex-wrap items-end gap-3 text-sm">
        <div>
          <label className="label">Recherche</label>
          <input className="input" name="q" defaultValue={q} placeholder="Réf., nom, email…" />
        </div>
        <div>
          <label className="label">Statut</label>
          <select className="input" name="statut" defaultValue={status}>
            <option value="">Toutes sauf annulées</option>
            <option value="ALL">Toutes</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Point de retrait</label>
          <select className="input" name="point" defaultValue={point}>
            <option value="">Tous</option>
            {points.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Jour de retrait</label>
          <input className="input" type="date" name="jour" defaultValue={day} />
        </div>
        <div>
          <label className="label">Paiement</label>
          <select className="input" name="paiement" defaultValue={paiement}>
            <option value="">Tous</option>
            <option value="TRANSFER_PENDING">Virements en attente</option>
          </select>
        </div>
        <button className="btn">Filtrer</button>
        <Link href="/admin/commandes" className="btn-secondary">Réinitialiser</Link>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-creme text-left text-chocolat/70">
            <tr>
              <th className="px-4 py-2">Réf.</th>
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Retrait</th>
              <th className="px-4 py-2">Articles</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2">Paiement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-chocolat/10">
            {orders.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-chocolat/75">Aucune commande.</td></tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-creme/50">
                <td className="px-4 py-2 font-semibold">
                  <Link href={`/admin/commandes/${o.id}`} className="text-pervenche hover:underline">{o.reference}</Link>
                </td>
                <td className="px-4 py-2">
                  <div>{o.customerName}</div>
                  <div className="text-xs text-chocolat/75">{o.phone}</div>
                </td>
                <td className="px-4 py-2">
                  <div>{formatDateTime(o.pickupSlot.startsAt)}</div>
                  <div className="text-xs text-chocolat/75">{o.pickupSlot.pickupPoint.name}</div>
                </td>
                <td className="px-4 py-2 text-xs">
                  {o.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}
                </td>
                <td className="px-4 py-2 text-right">{formatPrice(o.totalCents)}</td>
                <td className="px-4 py-2"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-2"><PaymentBadge method={o.paymentMethod} status={o.paymentStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
