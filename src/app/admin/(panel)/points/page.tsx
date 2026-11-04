import Link from "next/link";
import { db } from "@/lib/db";
import { PointForm } from "./point-form";

export default async function PointsPage() {
  const points = await db.pickupPoint.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { slots: { where: { active: true, startsAt: { gte: new Date() } } } } } },
  });
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-bold">Points de retrait</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {points.length === 0 && <p className="text-sm text-ink/60">Aucun point de retrait pour le moment.</p>}
        {points.map((p) => (
          <Link key={p.id} href={`/admin/points/${p.id}`} className="card hover:border-berry">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold">{p.name}</div>
              {!p.active && <span className="text-xs text-ink/50">Inactif</span>}
            </div>
            <div className="text-sm text-ink/70">{p.address}</div>
            <div className="mt-2 text-xs text-pine">{p._count.slots} créneau(x) à venir</div>
          </Link>
        ))}
      </div>
      <div>
        <h2 className="mb-3 font-serif text-xl font-semibold">Ajouter un point de retrait</h2>
        <PointForm />
      </div>
    </div>
  );
}
