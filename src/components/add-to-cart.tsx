"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { lineKey, useCart } from "./cart";

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

export type Variant = { id: string; name: string; priceCents: number };

export function AddToCart({
  productId,
  name,
  priceCents,
  variants,
}: {
  productId: string;
  name: string;
  priceCents: number;
  variants: Variant[];
}) {
  const { add, lines } = useCart();
  const [qty, setQty] = useState(1);
  const [variantId, setVariantId] = useState<string | null>(variants.length === 1 ? variants[0].id : null);
  const [added, setAdded] = useState<string | null>(null);
  const [missingChoice, setMissingChoice] = useState(false);

  const hasVariants = variants.length > 0;
  const variant = variants.find((v) => v.id === variantId) ?? null;
  // Prix affiché à côté d'un goût seulement s'ils ne coûtent pas tous pareil
  const pricesDiffer = new Set(variants.map((v) => v.priceCents)).size > 1;
  const inCart = lines.filter((l) => l.productId === productId).reduce((s, l) => s + l.quantity, 0);
  const groupId = `gout-${productId}`;

  return (
    <div className="space-y-4">
      {hasVariants && (
        <fieldset>
          <legend id={groupId} className="mb-2 text-sm font-medium">
            Choisissez le goût
          </legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={groupId}>
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={variantId === v.id}
                onClick={() => {
                  setVariantId(v.id);
                  setMissingChoice(false);
                }}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${variantId === v.id ? "border-chocolat bg-chocolat text-white" : "border-cacao/40 bg-papier hover:border-chocolat"}`}
              >
                {v.name}
                {pricesDiffer && <span className={variantId === v.id ? "text-white/80" : "text-chocolat/70"}> {formatPrice(v.priceCents)}</span>}
              </button>
            ))}
          </div>
          {missingChoice && (
            <p role="alert" className="mt-2 text-sm text-red-800">
              Choisissez d&apos;abord un goût.
            </p>
          )}
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper value={qty} onChange={(v) => setQty(Math.min(99, Math.max(1, v)))} label={name} />
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (hasVariants && !variant) {
              setMissingChoice(true);
              return;
            }
            add(
              {
                productId,
                variantId: variant?.id ?? null,
                name: variant ? `${name} (${variant.name})` : name,
                priceCents: variant?.priceCents ?? priceCents,
              },
              qty,
            );
            setAdded(lineKey(productId, variant?.id ?? null));
            setQty(1);
            setTimeout(() => setAdded(null), 1800);
          }}
        >
          {added ? "Ajouté au panier" : "Ajouter au panier"}
        </button>
        {inCart > 0 && <span className="text-sm text-chocolat/75">{inCart} dans votre panier</span>}
      </div>
    </div>
  );
}
