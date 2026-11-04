"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useCart } from "@/components/cart";
import { formatPrice, PAYMENT_LABELS } from "@/lib/format";
import { placeOrder, type CheckoutState } from "./actions";

type Point = {
  id: string;
  name: string;
  address: string;
  details: string;
  slots: { id: string; day: string; dayLabel: string; timeLabel: string; remaining: number }[];
};

export function CheckoutForm({
  points,
  paymentMethods,
  leadTimeHours,
}: {
  points: Point[];
  paymentMethods: (keyof typeof PAYMENT_LABELS)[];
  leadTimeHours: number;
}) {
  const cart = useCart();
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, null);
  const [pointId, setPointId] = useState(points.length === 1 ? points[0].id : "");
  const [slotId, setSlotId] = useState("");
  const [payment, setPayment] = useState(paymentMethods.length === 1 ? paymentMethods[0] : "");

  const point = points.find((p) => p.id === pointId);
  const slotsByDay = useMemo(() => {
    const map = new Map<string, { label: string; slots: Point["slots"] }>();
    for (const s of point?.slots ?? []) {
      if (!map.has(s.day)) map.set(s.day, { label: s.dayLabel, slots: [] });
      map.get(s.day)!.slots.push(s);
    }
    return [...map.values()];
  }, [point]);

  if (!cart.ready) return <p className="text-ink/60">Chargement…</p>;

  if (cart.lines.length === 0)
    return (
      <div className="card text-center">
        <p>Votre panier est vide.</p>
        <Link href="/" className="btn mt-4">
          Voir les produits
        </Link>
      </div>
    );

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <input type="hidden" name="items" value={JSON.stringify(cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })))} />
      <input type="hidden" name="pickupSlotId" value={slotId} />
      <input type="hidden" name="paymentMethod" value={payment} />

      <div className="space-y-6">
        <section className="card space-y-4">
          <h2 className="font-serif text-xl font-semibold">1. Point de retrait</h2>
          {points.length === 0 ? (
            <p className="text-sm text-ink/70">Aucun point de retrait n&apos;est disponible pour le moment.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {points.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => {
                    setPointId(p.id);
                    setSlotId("");
                  }}
                  className={`rounded-md border p-3 text-left text-sm transition ${pointId === p.id ? "border-berry bg-berry/5 ring-2 ring-berry/20" : "border-ink/15 bg-white hover:border-ink/40"}`}
                >
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-ink/70">{p.address}</div>
                  {p.details && <div className="mt-1 text-xs text-ink/60">{p.details}</div>}
                </button>
              ))}
            </div>
          )}
        </section>

        {point && (
          <section className="card space-y-4">
            <h2 className="font-serif text-xl font-semibold">2. Créneau de retrait</h2>
            <p className="text-xs text-ink/60">Les créneaux sont proposés au moins {leadTimeHours} h à l&apos;avance.</p>
            {slotsByDay.length === 0 ? (
              <p className="text-sm text-ink/70">Aucun créneau disponible pour ce point de retrait.</p>
            ) : (
              slotsByDay.map((d) => (
                <div key={d.label}>
                  <div className="mb-2 text-sm font-medium first-letter:uppercase">{d.label}</div>
                  <div className="flex flex-wrap gap-2">
                    {d.slots.map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        disabled={s.remaining === 0}
                        onClick={() => setSlotId(s.id)}
                        className={`rounded-md border px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${slotId === s.id ? "border-berry bg-berry text-white" : "border-ink/15 bg-white hover:border-ink/40"}`}
                      >
                        {s.timeLabel}
                        {s.remaining === 0 && " · complet"}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        <section className="card space-y-4">
          <h2 className="font-serif text-xl font-semibold">3. Vos coordonnées</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="customerName">Nom et prénom</label>
              <input className="input" id="customerName" name="customerName" required autoComplete="name" />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input className="input" id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div>
              <label className="label" htmlFor="phone">Téléphone</label>
              <input className="input" id="phone" name="phone" type="tel" required autoComplete="tel" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="note">Remarque (facultatif)</label>
              <textarea className="input" id="note" name="note" rows={2} />
            </div>
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="font-serif text-xl font-semibold">4. Paiement</h2>
          {paymentMethods.length === 0 && <p className="text-sm text-ink/70">Aucun mode de paiement n&apos;est configuré.</p>}
          {paymentMethods.map((m) => (
            <label key={m} className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm ${payment === m ? "border-berry bg-berry/5" : "border-ink/15"}`}>
              <input type="radio" name="_payment" checked={payment === m} onChange={() => setPayment(m)} className="accent-berry" />
              {PAYMENT_LABELS[m]}
            </label>
          ))}
        </section>
      </div>

      <aside className="card h-fit space-y-4 lg:sticky lg:top-4">
        <h2 className="font-serif text-xl font-semibold">Récapitulatif</h2>
        <ul className="space-y-3">
          {cart.lines.map((l) => (
            <li key={l.productId} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{l.name}</div>
                <div className="text-ink/60">{formatPrice(l.priceCents)}</div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" className="h-7 w-7 rounded border border-ink/20" onClick={() => cart.setQuantity(l.productId, l.quantity - 1)} aria-label="Diminuer">
                  −
                </button>
                <span className="w-6 text-center tabular-nums">{l.quantity}</span>
                <button type="button" className="h-7 w-7 rounded border border-ink/20" onClick={() => cart.setQuantity(l.productId, l.quantity + 1)} aria-label="Augmenter">
                  +
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-ink/10 pt-3 font-semibold">
          <span>Total</span>
          <span>{formatPrice(cart.totalCents)}</span>
        </div>
        <p className="text-xs text-ink/60">Le prix final est vérifié au moment de la commande.</p>
        {state?.error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
        <button type="submit" className="btn w-full" disabled={pending || !slotId || !payment}>
          {pending ? "Envoi…" : payment === "STRIPE" ? "Payer et commander" : "Valider la commande"}
        </button>
        {(!slotId || !payment) && <p className="text-center text-xs text-ink/60">Choisissez un créneau et un mode de paiement.</p>}
      </aside>
    </form>
  );
}
