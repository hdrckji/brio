import { getBookableSlots } from "@/lib/orders";
import { enabledPaymentMethods, getSettings } from "@/lib/settings";
import { CheckoutForm } from "./checkout-form";

export const metadata = { title: "Panier — Brio" };

export default async function CartPage({ searchParams }: PageProps<"/panier">) {
  const [settings, points, sp] = await Promise.all([getSettings(), getBookableSlots(), searchParams]);
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-bold">Mon panier</h1>
      {sp.annule && <div className="card border-gold/40 bg-gold/10">Le paiement a été annulé. Votre panier est toujours là.</div>}
      {settings.shopOpen !== "true" ? (
        <div className="card">{settings.closedMessage}</div>
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
