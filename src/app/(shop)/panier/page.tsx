import { getBookableSlots } from "@/lib/orders";
import { enabledPaymentMethods, getSettings } from "@/lib/settings";
import { CheckoutForm } from "./checkout-form";

export const metadata = { title: "Panier, Brio" };

export default async function CartPage({ searchParams }: PageProps<"/panier">) {
  const [settings, points, sp] = await Promise.all([getSettings(), getBookableSlots(), searchParams]);
  return (
    <div className="space-y-8">
      <h1 className="font-display text-6xl leading-none sm:text-7xl">Panier</h1>
      {sp.annule && (
        <p role="status" className="rounded-lg bg-kraft/70 px-5 py-4">
          Le paiement a été interrompu, rien n&apos;a été débité. Votre panier est intact : vous pouvez réessayer ou choisir un autre mode de paiement.
        </p>
      )}
      {settings.shopOpen !== "true" ? (
        <p className="rounded-lg bg-kraft/70 px-5 py-4 text-lg">{settings.closedMessage}</p>
      ) : (
        <CheckoutForm
          points={points}
          paymentMethods={enabledPaymentMethods(settings)}
          leadTimeHours={Number(settings.leadTimeHours)}
        />
      )}
    </div>
  );
}
