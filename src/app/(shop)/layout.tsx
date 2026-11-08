import { CartProvider } from "@/components/cart";
import { SiteHeader } from "@/components/site-header";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();
  return (
    <CartProvider>
      {/* Fond rayé du visuel Biscotte sur toute la page, le contenu est posé dessus comme une étiquette */}
      <div className="rayures flex min-h-screen flex-col pb-6">
        <SiteHeader shopName={settings.shopName} />
        <main className="etiquette mx-auto mt-6 w-[calc(100%-1.5rem)] max-w-4xl flex-1 px-5 pt-14 pb-14 sm:mt-8 sm:w-[calc(100%-4rem)] sm:px-12">
          {children}
        </main>
        <footer className="mx-auto mt-6 w-fit max-w-[calc(100%-1.5rem)] rounded-full bg-creme px-5 py-2 text-center text-sm">
          {settings.shopName}. Pas de livraison : toutes les commandes se retirent en point de retrait.
        </footer>
      </div>
    </CartProvider>
  );
}
