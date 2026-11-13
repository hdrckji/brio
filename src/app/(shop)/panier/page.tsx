import { getBookableSlots, getUncountedProductIds } from "@/lib/orders";
import { enabledPaymentMethods, getSettings } from "@/lib/settings";
import { CheckoutForm } from "./checkout-form";

export const metadata = { title: "Panier, Biscotte" };

export default async function CartPage({ searchParams }: PageProps<"/panier">) {
  const [settings, points, uncountedProductIds, sp] = await Promise.all([getSettings(), getBookableSlots(), getUncountedProductIds(), searchParams]);
  return (
    <div className="space-y-8">
      <h1 className="pt-6 text-center font-display text-5xl leading-none sm:text-6xl">Panier</h1>
      {sp.annule && (
        <p role="status" className="rounded-2xl border-2 border-dotted border-cacao/60 px-5 py-4">
          Le paiement a été interrompu, rien n&apos;a été débité. Votre panier est intact : vous pouvez réessayer ou choisir un autre mode de paiement.
        </p>
      )}
      {settings.shopOpen !== "true" ? (
        <p className="rounded-2xl border-2 border-dotted border-cacao/60 px-5 py-4 text-lg">{settings.closedMessage}</p>
      ) : (
        <CheckoutForm
          points={points}
          uncountedProductIds={uncountedProductIds}
          paymentMethods={enabledPaymentMethods(settings)}
          leadTimeHours={Number(settings.leadTimeHours)}
        />
      )}
    </div>
  );
}
