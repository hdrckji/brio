"use client";

import { useState } from "react";

export type EditableVariant = { id?: string; name: string; price: string; active: boolean };

/** Liste éditable des déclinaisons (goûts) d'un produit, envoyée au serveur en JSON. */
export function VariantsEditor({ initial }: { initial: EditableVariant[] }) {
  const [rows, setRows] = useState<EditableVariant[]>(initial);
  const update = (i: number, patch: Partial<EditableVariant>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const j = i + d;
      if (j < 0 || j >= r.length) return r;
      const next = [...r];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <fieldset className="space-y-3">
      <legend className="label">Goûts ou déclinaisons (facultatif)</legend>
      <p className="text-sm text-chocolat/75">
        Ex. pour un cougnou : nature, chocolat, raisins. Le client devra en choisir un. Laissez le prix vide pour reprendre le prix du produit.
      </p>
      <input type="hidden" name="variants" value={JSON.stringify(rows.filter((r) => r.name.trim()))} />
      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((row, i) => (
            <li key={row.id ?? `new-${i}`} className="flex flex-wrap items-center gap-2 rounded-md border border-cacao/25 bg-papier p-2">
              <input
                className="input min-w-40 flex-1"
                placeholder="Nom du goût"
                aria-label="Nom du goût"
                value={row.name}
                onChange={(e) => update(i, { name: e.target.value })}
              />
              <input
                className="input w-28"
                inputMode="decimal"
                placeholder="Prix (€)"
                aria-label="Prix propre en euros, facultatif"
                value={row.price}
                onChange={(e) => update(i, { price: e.target.value })}
              />
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" className="accent-chocolat" checked={row.active} onChange={(e) => update(i, { active: e.target.checked })} />
                En vente
              </label>
              <div className="flex gap-1">
                <button type="button" className="btn-secondary px-3 py-1" onClick={() => move(i, -1)} aria-label="Monter" disabled={i === 0}>
                  ↑
                </button>
                <button type="button" className="btn-secondary px-3 py-1" onClick={() => move(i, 1)} aria-label="Descendre" disabled={i === rows.length - 1}>
                  ↓
                </button>
                <button type="button" className="btn-danger px-3 py-1" onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>
                  Retirer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn-secondary" onClick={() => setRows((r) => [...r, { name: "", price: "", active: true }])}>
        Ajouter un goût
      </button>
    </fieldset>
  );
}
