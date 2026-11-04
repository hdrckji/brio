"use client";

import Link from "next/link";
import { useCart } from "./cart";

export function CartButton() {
  const { count, ready } = useCart();
  return (
    <Link href="/panier" className="btn">
      Panier
      {ready && count > 0 && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-berry">{count}</span>}
    </Link>
  );
}
