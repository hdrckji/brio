import { db } from "@/lib/db";
import { dayKey, formatDate, itemLabel, localToDate } from "@/lib/format";
import { PrintButton } from "./print-button";

export default async function ProductionPage({ searchParams }: PageProps<"/admin/production">) {
  const sp = await searchParams;
  const point = typeof sp.point === "string" ? sp.point : "";
  const from = typeof sp.du === "string" && sp.du ? sp.du : dayKey(new Date());

  const items = await db.orderItem.findMany({
    where: {
      order: {
        status: { in: ["CONFIRMED", "READY"] },
        pickupSlot: { startsAt: { gte: localToDate(from, "00:00") }, ...(point ? { pickupPointId: point } : {}) },
      },
    },
    select: {
      productName: true,
      variantName: true,
      quantity: true,
      order: { select: { pickupSlot: { select: { startsAt: true, pickupPoint: { select: { name: true } } } } } },
    },
  });
  const points = await db.pickupPoint.findMany({ orderBy: { name: "asc" } });

  // jour -> produit -> { total, parPoint }
  const days = new Map<string, { label: string; products: Map<string, { total: number; byPoint: Map<string, number> }> }>();
  for (const it of items) {
    const start = it.order.pickupSlot.startsAt;
    const key = dayKey(start);
    if (!days.has(key)) days.set(key, { label: formatDate(start), products: new Map() });
    const products = days.get(key)!.products;
    const label = itemLabel(it);
    if (!products.has(label)) products.set(label, { total: 0, byPoint: new Map() });
    const p = products.get(label)!;
    p.total += it.quantity;
    const pn = it.order.pickupSlot.pickupPoint.name;
    p.byPoint.set(pn, (p.byPoint.get(pn) ?? 0) + it.quantity);
  }
  const sortedDays = [...days.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-5xl leading-none">Production</h1>
        <PrintButton />
      </div>
      <p className="text-sm text-chocolat/75">Quantités à préparer par jour de retrait (commandes confirmées et prêtes, hors retirées et annulées).</p>
      <form className="card flex flex-wrap items-end gap-3 text-sm print:hidden">
        <div>
          <label className="label">À partir du</label>
          <input className="input" type="date" name="du" defaultValue={from} />
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
        <button className="btn">Afficher</button>
      </form>

      {sortedDays.length === 0 && <p className="card text-sm text-chocolat/75">Rien à produire sur cette période.</p>}
      {sortedDays.map(([key, d]) => (
        <section key={key} className="card break-inside-avoid">
          <h2 className="mb-3 font-display text-2xl first-letter:uppercase">{d.label}</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-chocolat/75">
              <tr>
                <th className="py-1">Produit</th>
                <th className="py-1 text-right">Total</th>
                <th className="py-1 pl-6">Détail par point</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-chocolat/10">
              {[...d.products.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([name, p]) => (
                  <tr key={name}>
                    <td className="py-2 font-medium">{name}</td>
                    <td className="py-2 text-right text-lg font-semibold tabular-nums">{p.total}</td>
                    <td className="py-2 pl-6 text-chocolat/70">
                      {[...p.byPoint.entries()].map(([pn, q]) => `${pn} : ${q}`).join(", ")}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
