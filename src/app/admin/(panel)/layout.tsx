import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administration Brio" };

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
      <header className="border-b border-sapin/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/admin" className="flex items-baseline gap-2">
            <span className="font-display text-3xl leading-none">Brio</span>
            <span className="text-sm text-sapin/75">administration</span>
          </Link>
          <nav className="flex flex-1 flex-wrap gap-1 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-full px-3 py-1.5 hover:bg-givre">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" target="_blank" className="text-sapin/75 hover:text-sapin">
              Voir le site
            </Link>
            <form action={logout}>
              <button className="text-sapin/75 hover:text-sapin">Déconnexion</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
