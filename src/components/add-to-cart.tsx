"use client";

import { useState } from "react";
import { useCart } from "./cart";

export function AddToCart({ productId, name, priceCents }: { productId: string; name: string; priceCents: number }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-md border border-ink/20 bg-white">
        <button type="button" aria-label="Diminuer" className="px-3 py-2" onClick={() => setQty((q) => Math.max(1, q - 1))}>
          −
        </button>
        <span className="w-6 text-center text-sm tabular-nums">{qty}</span>
        <button type="button" aria-label="Augmenter" className="px-3 py-2" onClick={() => setQty((q) => Math.min(99, q + 1))}>
          +
        </button>
      </div>
      <button
        type="button"
        className="btn flex-1"
        onClick={() => {
          add({ productId, name, priceCents }, qty);
          setAdded(true);
          setTimeout(() => setAdded(false), 1500);
        }}
      >
        {added ? "Ajouté ✓" : "Ajouter"}
      </button>
    </div>
  );
}
