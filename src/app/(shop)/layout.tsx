import Link from "next/link";
import { CartProvider } from "@/components/cart";
import { CartButton } from "@/components/cart-button";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();
  return (
    <CartProvider>
      <header className="border-b border-ink/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="font-serif text-2xl font-bold text-berry">
            {settings.shopName}
          </Link>
          <CartButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-ink/10 py-6 text-center text-sm text-ink/60">
        {settings.shopName} · Retrait uniquement, pas de livraison
      </footer>
    </CartProvider>
  );
}
