"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader({ shopName }: { shopName: string }) {
  const home = usePathname() === "/";
  return (
    <header className="relative mx-auto w-full max-w-5xl px-4 sm:px-8">
      {home ? (
        // Accueil : le médaillon du logo, posé sur les rayures et à cheval sur l'étiquette
        <Image
          src="/logo-biscotte.webp"
          alt={shopName}
          width={716}
          height={732}
          priority
          className="relative z-10 mx-auto -mb-24 w-60 drop-shadow-[0_8px_16px_rgba(92,49,34,0.22)] sm:-mb-32 sm:w-80"
        />
      ) : (
        <Link href="/" aria-label={`${shopName}, retour à la carte`} className="relative z-10 mx-auto -mb-14 block w-28 sm:w-32">
          <Image src="/logo-biscotte.webp" alt="" width={716} height={732} priority className="drop-shadow-[0_6px_12px_rgba(92,49,34,0.2)]" />
        </Link>
      )}
    </header>
  );
}
