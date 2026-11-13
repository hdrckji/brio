import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/action-form";
import { db } from "@/lib/db";
import { dayKey, formatDate, formatTime } from "@/lib/format";
import { bookedArticles, slotBookingsInclude } from "@/lib/orders";
import { deleteAllSlots, deletePickupPoint, deleteSlot, generateSlots, setUpcomingSlotsCapacity, updateSlot } from "../../../actions";
import { PointForm } from "../point-form";
import { requireAdmin } from "@/lib/auth";

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
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const showPast = sp.passes === "1";
  const point = await db.pickupPoint.findUnique({
    where: { id },
    include: {
      slots: {
        where: showPast ? {} : { endsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        include: slotBookingsInclude,
      },
    },
  });
  if (!point) notFound();
  // Tous les créneaux du point, y compris les passés masqués dans la liste.
  const totalSlots = await db.pickupSlot.count({ where: { pickupPointId: id } });

  const byDay = new Map<string, { label: string; slots: typeof point.slots }>();
  for (const s of point.slots) {
    const k = dayKey(s.startsAt);
    if (!byDay.has(k)) byDay.set(k, { label: formatDate(s.startsAt), slots: [] });
    byDay.get(k)!.slots.push(s);
  }
  const today = dayKey(new Date());

  return (
    <div className="space-y-6">
      <Link href="/admin/points" className="text-sm text-chocolat/75 hover:text-chocolat">Tous les points de retrait</Link>
      <h1 className="font-display text-5xl leading-none">{point.name}</h1>

      <PointForm point={point} />

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Ajouter des créneaux</h2>
        <ActionForm action={generateSlots} className="card space-y-4 text-sm">
          <input type="hidden" name="pickupPointId" value={point.id} />
          <p className="text-chocolat/75">
            Génère des créneaux réguliers sur une période. Ex. : du 20 au 24 décembre, de 08:00 à 12:00, créneaux de 30 min, 10 articles max par créneau. La limite compte les articles, pas les commandes : une commande de 6 pièces prend 6 places. Les produits réglés « hors limite » dans leur fiche (ex. truffes) ne comptent pas.
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
                    <input type="checkbox" name="weekdays" value={d.v} defaultChecked className="accent-pervenche" />
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
                <label className="label">Max articles</label>
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
          <Link href={showPast ? `/admin/points/${id}` : `/admin/points/${id}?passes=1`} className="text-sm text-pervenche hover:underline">
            {showPast ? "Masquer les créneaux passés" : "Afficher les créneaux passés"}
          </Link>
        </div>
        {byDay.size === 0 && <p className="card text-sm text-chocolat/75">Aucun créneau.</p>}
        {byDay.size > 0 && (
          <ActionForm action={setUpcomingSlotsCapacity} className="card space-y-3 text-sm">
            <input type="hidden" name="pickupPointId" value={point.id} />
            <label className="label" htmlFor="bulkCapacity">Articles max pour tous les créneaux à venir</label>
            <div className="flex flex-wrap items-center gap-3">
              <input className="input w-28" id="bulkCapacity" type="number" name="capacity" min={1} required />
              <ConfirmButton message="Remplacer la limite de tous les créneaux à venir de ce point de retrait ?" className="btn-secondary">
                Appliquer à tous
              </ConfirmButton>
            </div>
          </ActionForm>
        )}
        {[...byDay.entries()].map(([k, d]) => (
          <div key={k} className="card p-0">
            <div className="border-b border-chocolat/10 px-4 py-2 font-medium first-letter:uppercase">{d.label}</div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-chocolat/10">
                {d.slots.map((s) => {
                  const booked = bookedArticles(s);
                  return (
                    <tr key={s.id} className={s.active ? "" : "text-chocolat/55"}>
                      <td className="px-4 py-2 tabular-nums">
                        {formatTime(s.startsAt)} – {formatTime(s.endsAt)}
                      </td>
                      <td className="px-4 py-2">
                        <span className={booked >= s.capacity ? "font-semibold text-pervenche" : ""}>
                          {booked} / {s.capacity}
                        </span>{" "}
                        article(s)
                        <span className="text-chocolat/55"> · {s.orders.length} commande(s)</span>
                      </td>
                      <td className="px-4 py-2">
                        <form key={`${s.capacity}-${s.active}`} action={updateSlot} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={s.id} />
                          <input className="input w-20 py-1" type="number" name="capacity" min={0} defaultValue={s.capacity} aria-label="Articles max" title="Articles max" />
                          <label className="flex items-center gap-1">
                            <input type="checkbox" name="active" defaultChecked={s.active} className="accent-pervenche" /> Ouvert
                          </label>
                          <SubmitButton className="btn-secondary py-1">OK</SubmitButton>
                        </form>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <form action={deleteSlot}>
                          <input type="hidden" name="id" value={s.id} />
                          <ConfirmButton
                            message={s.orders.length > 0 ? "Ce créneau a des commandes : il sera fermé, pas supprimé. Continuer ?" : "Supprimer ce créneau ?"}
                            className="text-xs text-red-700 hover:underline"
                          >
                            Supprimer
                          </ConfirmButton>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
        {/* Le formulaire reste affiché une fois tout supprimé, pour garder le message de résultat. */}
        <ActionForm action={deleteAllSlots} className="space-y-3">
          <input type="hidden" name="pickupPointId" value={point.id} />
          {totalSlots > 0 && (
            <ConfirmButton
              message={`Supprimer les ${totalSlots} créneau(x) de ce point de retrait, passés compris ? Ceux qui ont déjà des commandes seront fermés, pas supprimés.`}
              className="text-sm text-red-700 hover:underline"
            >
              Supprimer tous les créneaux
            </ConfirmButton>
          )}
        </ActionForm>
      </section>

      <form action={deletePickupPoint} className="border-t border-chocolat/10 pt-6">
        <input type="hidden" name="id" value={point.id} />
        <ConfirmButton message="Supprimer ce point de retrait ? S'il a déjà des commandes, il sera seulement désactivé.">
          Supprimer le point de retrait
        </ConfirmButton>
      </form>
    </div>
  );
}
