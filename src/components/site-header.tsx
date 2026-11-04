"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CartButton } from "./cart-button";

export function SiteHeader({ shopName }: { shopName: string }) {
  const home = usePathname() === "/";
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 pt-5 sm:px-8">
      {/* Sur l'accueil, le nom est déjà affiché en grand dans l'en-tête de page */}
      <Link href="/" className={`font-display text-3xl leading-none ${home ? "invisible" : ""}`} aria-hidden={home} tabIndex={home ? -1 : 0}>
        {shopName}
      </Link>
      <CartButton />
    </header>
  );
}
