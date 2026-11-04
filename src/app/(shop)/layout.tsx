import { CartProvider } from "@/components/cart";
import { SiteHeader } from "@/components/site-header";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();
  return (
    <CartProvider>
      <SiteHeader shopName={settings.shopName} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pt-6 pb-16 sm:px-8">{children}</main>
      <footer className="mx-auto w-full max-w-5xl px-5 pb-8 text-sm text-sapin/75 sm:px-8">
        {settings.shopName}. Pas de livraison : toutes les commandes se retirent sur place.
      </footer>
    </CartProvider>
  );
}
