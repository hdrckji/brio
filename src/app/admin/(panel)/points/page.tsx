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
      <h1 className="font-display text-5xl leading-none">Points de retrait</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {points.length === 0 && <p className="text-sm text-chocolat/75">Aucun point de retrait pour le moment.</p>}
        {points.map((p) => (
          <Link key={p.id} href={`/admin/points/${p.id}`} className="card hover:border-pervenche">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold">{p.name}</div>
              {!p.active && <span className="text-xs text-chocolat/65">Inactif</span>}
            </div>
            <div className="text-sm text-chocolat/70">{p.address}</div>
            <div className="mt-2 text-xs text-pervenche">{p._count.slots} créneau(x) à venir</div>
          </Link>
        ))}
      </div>
      <div>
        <h2 className="mb-3 font-display text-2xl">Ajouter un point de retrait</h2>
        <PointForm />
      </div>
    </div>
  );
}
