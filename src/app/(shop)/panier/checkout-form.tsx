"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { QuantityStepper } from "@/components/add-to-cart";
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
  uncountedProductIds,
  paymentMethods,
  leadTimeHours,
}: {
  points: Point[];
  /** Produits qui ne prennent pas de place dans un créneau (ex. truffes). */
  uncountedProductIds: string[];
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

  if (!cart.ready) return <p className="text-chocolat/75">Chargement du panier…</p>;

  if (cart.lines.length === 0)
    return (
      <div className="max-w-md py-6">
        <p className="text-lg">Votre panier est vide. Choisissez vos pâtisseries sur la carte de Noël.</p>
        <Link href="/" className="btn mt-5">
          Voir la carte
        </Link>
      </div>
    );

  // La capacité d'un créneau se compte en articles : il doit rester assez de place pour tout le panier,
  // sans compter les produits hors limite.
  const articles = cart.lines.reduce((sum, l) => sum + (uncountedProductIds.includes(l.productId) ? 0 : l.quantity), 0);
  const fits = (s: Point["slots"][number]) => s.remaining >= articles;
  const slot = point?.slots.find((s) => s.id === slotId);
  const tooSmall = (point?.slots ?? []).filter((s) => s.remaining > 0 && !fits(s)).length;
  const noSlotFits = !point?.slots.some(fits);

  const missing = !pointId
    ? "Choisissez un point de retrait."
    : !slot
      ? "Choisissez un créneau de retrait."
      : !fits(slot)
        ? "Ce créneau n'a plus assez de place pour votre panier. Choisissez-en un autre."
        : !payment
          ? "Choisissez un mode de paiement."
          : null;

  return (
    <form action={action} className="grid items-start gap-10 lg:grid-cols-[1fr_360px]">
      <input type="hidden" name="items" value={JSON.stringify(cart.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })))} />
      <input type="hidden" name="pickupSlotId" value={slotId} />
      <input type="hidden" name="paymentMethod" value={payment} />

      <div className="space-y-10">
        <Step n={1} title="Lieu de retrait">
          {points.length === 0 ? (
            <p className="text-chocolat/75">Aucun point de retrait n&apos;est ouvert pour le moment.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Point de retrait">
              {points.map((p) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={pointId === p.id}
                  key={p.id}
                  onClick={() => {
                    setPointId(p.id);
                    setSlotId("");
                  }}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${pointId === p.id ? "border-chocolat bg-papier" : "border-cacao/20 bg-papier/60 hover:border-cacao"}`}
                >
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-chocolat/80">{p.address}</div>
                  {p.details && <div className="mt-1 text-sm text-chocolat/75">{p.details}</div>}
                </button>
              ))}
            </div>
          )}
        </Step>

        <Step n={2} title="Créneau">
          {!point ? (
            <p className="text-chocolat/75">Choisissez d&apos;abord un point de retrait.</p>
          ) : slotsByDay.length === 0 ? (
            <p className="text-chocolat/75">Plus aucun créneau n&apos;est disponible à {point.name}. Essayez un autre point de retrait.</p>
          ) : (
            <div className="space-y-5" role="radiogroup" aria-label="Créneau de retrait">
              <p className="text-sm text-chocolat/75">
                Seuls les créneaux à plus de {leadTimeHours} heures sont proposés. Votre commande est préparée le jour même du retrait.
              </p>
              {noSlotFits ? (
                <p role="status" className="rounded-lg bg-papier px-4 py-3 text-sm">
                  {tooSmall > 0
                    ? `Aucun créneau n'a assez de place pour votre panier à ${point.name}. Essayez un autre point de retrait ou réduisez votre panier.`
                    : `Tous les créneaux sont complets à ${point.name}. Essayez un autre point de retrait.`}
                </p>
              ) : (
                tooSmall > 0 && (
                  <p role="status" className="text-sm text-chocolat/75">
                    Les créneaux barrés sont complets ou n&apos;ont plus assez de place pour votre panier.
                  </p>
                )
              )}
              {slotsByDay.map((d) => (
                <div key={d.label}>
                  <div className="mb-2 font-semibold first-letter:uppercase">{d.label}</div>
                  <div className="flex flex-wrap gap-2">
                    {d.slots.map((s) => (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={slotId === s.id}
                        key={s.id}
                        disabled={!fits(s)}
                        onClick={() => setSlotId(s.id)}
                        className={`rounded-full border px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:border-transparent disabled:bg-transparent disabled:text-chocolat/45 disabled:line-through ${slotId === s.id ? "border-chocolat bg-chocolat text-white" : "border-cacao/35 bg-papier hover:border-chocolat"}`}
                      >
                        {s.timeLabel}
                        {!fits(s) && <span className="sr-only">{s.remaining === 0 ? " (complet)" : ` (plus que ${s.remaining} place${s.remaining > 1 ? "s" : ""})`}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Step>

        <Step n={3} title="Vos coordonnées">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="customerName">Nom et prénom</label>
              <input className="input" id="customerName" name="customerName" required autoComplete="name" />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input className="input" id="email" name="email" type="email" required autoComplete="email" />
              <p className="mt-1 text-sm text-chocolat/75">Pour recevoir la confirmation.</p>
            </div>
            <div>
              <label className="label" htmlFor="phone">Téléphone</label>
              <input className="input" id="phone" name="phone" type="tel" required autoComplete="tel" />
              <p className="mt-1 text-sm text-chocolat/75">En cas d&apos;imprévu le jour du retrait.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="note">Une précision pour la boulangerie ? (facultatif)</label>
              <textarea className="input" id="note" name="note" rows={2} />
            </div>
          </div>
        </Step>

        <Step n={4} title="Paiement">
          {paymentMethods.length === 0 && <p className="text-chocolat/75">Aucun mode de paiement n&apos;est disponible pour le moment.</p>}
          <div className="space-y-2">
            {paymentMethods.map((m) => (
              <label
                key={m}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 bg-papier p-4 transition-colors ${payment === m ? "border-chocolat" : "border-cacao/20 hover:border-cacao"}`}
              >
                <input type="radio" name="_payment" checked={payment === m} onChange={() => setPayment(m)} className="mt-1 accent-chocolat" />
                <span>
                  <span className="block font-semibold">{PAYMENT_LABELS[m]}</span>
                  <span className="block text-sm text-chocolat/75">{PAYMENT_HELP[m]}</span>
                </span>
              </label>
            ))}
          </div>
        </Step>
      </div>

      <aside className="lg:sticky lg:top-6">
        <div className="rounded-2xl border-2 border-cacao bg-papier px-6 pt-6 pb-5 outline-2 -outline-offset-[10px] outline-cacao/50 outline-dotted">
          <h2 className="text-center font-display text-3xl leading-none">Votre commande</h2>
          <ul className="mt-5 space-y-4">
            {cart.lines.map((l) => (
              <li key={l.key}>
                <div className="flex items-end">
                  <span className="font-medium">{l.name}</span>
                  <span className="leader" aria-hidden />
                  <span>{formatPrice(l.priceCents * l.quantity)}</span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-sm">
                  <QuantityStepper value={l.quantity} onChange={(v) => cart.setQuantity(l.key, v)} label={l.name} />
                  <span className="text-chocolat/75">{formatPrice(l.priceCents)} pièce</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-end border-t border-cacao/50 pt-3 text-lg font-semibold">
            <span>Total</span>
            <span className="flex-1" />
            <span>{formatPrice(cart.totalCents)}</span>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {state?.error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {state.error}
            </p>
          )}
          <button type="submit" className="btn w-full py-3 text-base" disabled={pending || Boolean(missing)}>
            {pending ? "Envoi de la commande…" : payment === "STRIPE" ? "Payer et commander" : "Commander"}
          </button>
          {missing && <p className="text-center text-sm text-chocolat/75">{missing}</p>}
        </div>
      </aside>
    </form>
  );
}

const PAYMENT_HELP = {
  STRIPE: "Paiement sécurisé par Stripe, immédiatement.",
  TRANSFER: "Les coordonnées bancaires s'affichent après la commande.",
  CASH: "Vous payez en retirant votre commande.",
} as const;

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 flex items-baseline gap-3 border-b border-cacao/40 pb-2">
        <span className="font-display text-3xl leading-none text-pervenche">{n}.</span>
        <span className="font-display text-3xl leading-none">{title}</span>
      </h2>
      {children}
    </section>
  );
}
