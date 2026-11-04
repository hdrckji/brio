"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/** Une ligne = un produit dans une déclinaison donnée (ex. cougnou chocolat). */
export type CartLine = {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  priceCents: number;
  quantity: number;
};

type NewLine = Omit<CartLine, "key" | "quantity">;

type CartContextValue = {
  lines: CartLine[];
  count: number;
  totalCents: number;
  ready: boolean;
  add: (p: NewLine, qty?: number) => void;
  setQuantity: (key: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
// v2 : ajout des déclinaisons (les paniers v1 sont abandonnés)
const KEY = "coukiz-cart-v2";

export const lineKey = (productId: string, variantId: string | null) => `${productId}:${variantId ?? ""}`;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique du stockage local au montage
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {}
  }, [lines, ready]);

  const add = useCallback((p: NewLine, qty = 1) => {
    const key = lineKey(p.productId, p.variantId);
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) return prev.map((l) => (l.key === key ? { ...l, ...p, quantity: Math.min(99, l.quantity + qty) } : l));
      return [...prev, { ...p, key, quantity: qty }];
    });
  }, []);

  const setQuantity = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      qty <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(99, qty) } : l)),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({
      lines,
      ready,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      totalCents: lines.reduce((s, l) => s + l.quantity * l.priceCents, 0),
      add,
      setQuantity,
      clear,
    }),
    [lines, ready, add, setQuantity, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans <CartProvider>");
  return ctx;
}
