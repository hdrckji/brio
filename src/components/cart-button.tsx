"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./cart";

export function CartButton() {
  const { count, ready } = useCart();
  // Sur la page panier, le bouton reste en haut : collant, il passerait sur le récapitulatif de commande
  const sticky = usePathname() !== "/panier";
  const filled = ready && count > 0;
  const label = filled ? `Panier, ${count} article${count > 1 ? "s" : ""}` : "Panier";
  return (
    // Suit le défilement pour rester sous la main tout au long de la carte
    <div className={`pointer-events-none z-40 mx-auto flex w-full max-w-5xl justify-end px-4 pt-4 sm:px-8 sm:pt-6 ${sticky ? "sticky top-0" : ""}`}>
      <Link
        href="/panier"
        aria-label={label}
        className="btn pointer-events-auto px-6 py-3 text-base shadow-[0_6px_18px_rgba(92,49,34,0.35)] ring-4 ring-creme"
      >
        <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
          <path d="M3 9h18l-1.6 9.2a2 2 0 0 1-2 1.8H6.6a2 2 0 0 1-2-1.8L3 9Z" />
          <path d="M8 9l3.5-6M16 9l-3.5-6" />
        </svg>
        Panier
        {filled && (
          // key : rejoue le petit rebond à chaque article ajouté
          <span key={count} className="rebond -mr-2 grid min-w-7 place-items-center rounded-full bg-creme px-2 text-sm leading-7 font-bold text-chocolat">
            {count}
          </span>
        )}
      </Link>
    </div>
  );
}
