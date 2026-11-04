"use client";

import Link from "next/link";
import { useCart } from "./cart";

export function CartButton() {
  const { count, ready } = useCart();
  const label = ready && count > 0 ? `Panier, ${count} article${count > 1 ? "s" : ""}` : "Panier";
  return (
    <Link href="/panier" className="btn" aria-label={label}>
      Panier
      {ready && count > 0 && (
        <span className="-mr-2 grid min-w-6 place-items-center rounded-full bg-airelle px-1.5 text-xs leading-6 font-bold text-white">{count}</span>
      )}
    </Link>
  );
}
