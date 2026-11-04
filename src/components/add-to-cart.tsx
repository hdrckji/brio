"use client";

import { useState } from "react";
import { useCart } from "./cart";

export function QuantityStepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="inline-flex items-center rounded-full border border-cacao/35 bg-papier">
      <button type="button" aria-label={`Retirer un ${label}`} className="grid h-10 w-10 place-items-center rounded-full text-lg hover:bg-kraft/60" onClick={() => onChange(value - 1)}>
        −
      </button>
      <span className="w-7 text-center font-semibold" aria-live="polite">
        {value}
      </span>
      <button type="button" aria-label={`Ajouter un ${label}`} className="grid h-10 w-10 place-items-center rounded-full text-lg hover:bg-kraft/60" onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

export function AddToCart({ productId, name, priceCents }: { productId: string; name: string; priceCents: number }) {
  const { add, lines } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const inCart = lines.find((l) => l.productId === productId)?.quantity ?? 0;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <QuantityStepper value={qty} onChange={(v) => setQty(Math.min(99, Math.max(1, v)))} label={name} />
      <button
        type="button"
        className="btn"
        onClick={() => {
          add({ productId, name, priceCents }, qty);
          setAdded(true);
          setQty(1);
          setTimeout(() => setAdded(false), 1800);
        }}
      >
        {added ? "Ajouté au panier" : "Ajouter au panier"}
      </button>
      {inCart > 0 && <span className="text-sm text-chocolat/75">{inCart} dans votre panier</span>}
    </div>
  );
}
