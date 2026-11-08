import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administration Biscotte" };

const NAV = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/commandes", label: "Commandes" },
  { href: "/admin/production", label: "Production" },
  { href: "/admin/produits", label: "Produits" },
  { href: "/admin/points", label: "Points de retrait" },
  { href: "/admin/parametres", label: "Paramètres" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-cacao/30 bg-papier">
        <div className="rayures h-2" aria-hidden />
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <Image src="/logo-biscotte.webp" alt="" width={716} height={732} priority className="h-11 w-auto" />
            <span className="text-sm text-chocolat/75">Administration</span>
          </Link>
          <nav className="flex flex-1 flex-wrap gap-1 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-full px-3 py-1.5 hover:bg-creme">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" target="_blank" className="text-chocolat/75 hover:text-chocolat">
              Voir le site
            </Link>
            <form action={logout}>
              <button className="text-chocolat/75 hover:text-chocolat">Déconnexion</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
