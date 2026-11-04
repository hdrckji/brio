import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/action-form";
import { db } from "@/lib/db";
import { dayKey, formatDate, formatTime } from "@/lib/format";
import { deletePickupPoint, deleteSlot, generateSlots, updateSlot } from "../../../actions";
import { PointForm } from "../point-form";

const WEEKDAYS = [
  { v: 1, l: "Lun" },
  { v: 2, l: "Mar" },
  { v: 3, l: "Mer" },
  { v: 4, l: "Jeu" },
  { v: 5, l: "Ven" },
  { v: 6, l: "Sam" },
  { v: 0, l: "Dim" },
];

export default async function PointPage({ params, searchParams }: PageProps<"/admin/points/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const showPast = sp.passes === "1";
  const point = await db.pickupPoint.findUnique({
    where: { id },
    include: {
      slots: {
        where: showPast ? {} : { endsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        include: { _count: { select: { orders: { where: { status: { not: "CANCELLED" } } } } } },
      },
    },
  });
  if (!point) notFound();

  const byDay = new Map<string, { label: string; slots: typeof point.slots }>();
  for (const s of point.slots) {
    const k = dayKey(s.startsAt);
    if (!byDay.has(k)) byDay.set(k, { label: formatDate(s.startsAt), slots: [] });
    byDay.get(k)!.slots.push(s);
  }
  const today = dayKey(new Date());

  return (
    <div className="space-y-6">
      <Link href="/admin/points" className="text-sm text-cerise/75 hover:text-cerise">Tous les points de retrait</Link>
      <h1 className="font-display text-5xl leading-none">{point.name}</h1>

      <PointForm point={point} />

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Ajouter des créneaux</h2>
        <ActionForm action={generateSlots} className="card space-y-4 text-sm">
          <input type="hidden" name="pickupPointId" value={point.id} />
          <p className="text-cerise/75">
            Génère des créneaux réguliers sur une période. Ex. : du 20 au 24 décembre, de 08:00 à 12:00, créneaux de 30 min, 10 commandes max par créneau.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Du</label>
              <input className="input" type="date" name="fromDay" required defaultValue={today} />
            </div>
            <div>
              <label className="label">Au</label>
              <input className="input" type="date" name="toDay" required defaultValue={today} />
            </div>
            <div>
              <label className="label">Jours</label>
              <div className="flex flex-wrap gap-2 pt-2">
                {WEEKDAYS.map((d) => (
                  <label key={d.v} className="flex items-center gap-1">
                    <input type="checkbox" name="weekdays" value={d.v} defaultChecked className="accent-sapin" />
                    {d.l}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label">De</label>
              <input className="input" type="time" name="startTime" required defaultValue="08:00" />
            </div>
            <div>
              <label className="label">À</label>
              <input className="input" type="time" name="endTime" required defaultValue="12:00" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Durée (min)</label>
                <input className="input" type="number" name="duration" min={5} required defaultValue={30} />
              </div>
              <div>
                <label className="label">Max commandes</label>
                <input className="input" type="number" name="capacity" min={1} required defaultValue={10} />
              </div>
            </div>
          </div>
          <SubmitButton>Générer les créneaux</SubmitButton>
        </ActionForm>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Créneaux</h2>
          <Link href={showPast ? `/admin/points/${id}` : `/admin/points/${id}?passes=1`} className="text-sm text-sapin hover:underline">
            {showPast ? "Masquer les créneaux passés" : "Afficher les créneaux passés"}
          </Link>
        </div>
        {byDay.size === 0 && <p className="card text-sm text-cerise/75">Aucun créneau.</p>}
        {[...byDay.entries()].map(([k, d]) => (
          <div key={k} className="card p-0">
            <div className="border-b border-cerise/10 px-4 py-2 font-medium first-letter:uppercase">{d.label}</div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-cerise/10">
                {d.slots.map((s) => (
                  <tr key={s.id} className={s.active ? "" : "text-cerise/55"}>
                    <td className="px-4 py-2 tabular-nums">
                      {formatTime(s.startsAt)} – {formatTime(s.endsAt)}
                    </td>
                    <td className="px-4 py-2">
                      <span className={s._count.orders >= s.capacity ? "font-semibold text-sapin" : ""}>
                        {s._count.orders} / {s.capacity}
                      </span>{" "}
                      réservé(s)
                    </td>
                    <td className="px-4 py-2">
                      <form action={updateSlot} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={s.id} />
                        <input className="input w-20 py-1" type="number" name="capacity" min={0} defaultValue={s.capacity} aria-label="Capacité" />
                        <label className="flex items-center gap-1">
                          <input type="checkbox" name="active" defaultChecked={s.active} className="accent-sapin" /> Ouvert
                        </label>
                        <SubmitButton className="btn-secondary py-1">OK</SubmitButton>
                      </form>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <form action={deleteSlot}>
                        <input type="hidden" name="id" value={s.id} />
                        <ConfirmButton
                          message={s._count.orders > 0 ? "Ce créneau a des commandes : il sera fermé, pas supprimé. Continuer ?" : "Supprimer ce créneau ?"}
                          className="text-xs text-red-700 hover:underline"
                        >
                          Supprimer
                        </ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      <form action={deletePickupPoint} className="border-t border-cerise/10 pt-6">
        <input type="hidden" name="id" value={point.id} />
        <ConfirmButton message="Supprimer ce point de retrait ? S'il a déjà des commandes, il sera seulement désactivé.">
          Supprimer le point de retrait
        </ConfirmButton>
      </form>
    </div>
  );
}
