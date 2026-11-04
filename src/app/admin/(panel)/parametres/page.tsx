import { ActionForm, SubmitButton } from "@/components/action-form";
import { getSettings } from "@/lib/settings";
import { updateSettings } from "../../actions";

function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={checked} className="accent-pervenche" /> {label}
    </label>
  );
}

export default async function SettingsPage() {
  const s = await getSettings();
  const stripeReady = Boolean(process.env.STRIPE_SECRET_KEY);
  const webhookReady = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  const smtpReady = Boolean(process.env.SMTP_HOST);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-5xl leading-none">Paramètres</h1>
      <ActionForm action={updateSettings} className="max-w-2xl space-y-6">
        <section className="card space-y-4">
          <h2 className="font-display text-2xl">Boutique</h2>
          <div>
            <label className="label" htmlFor="shopName">Nom</label>
            <input className="input" id="shopName" name="shopName" defaultValue={s.shopName} />
          </div>
          <div>
            <label className="label" htmlFor="shopTagline">Accroche</label>
            <input className="input" id="shopTagline" name="shopTagline" defaultValue={s.shopTagline} />
          </div>
          <Check name="shopOpen" label="Commandes ouvertes" checked={s.shopOpen === "true"} />
          <div>
            <label className="label" htmlFor="closedMessage">Message quand les commandes sont fermées</label>
            <textarea className="input" id="closedMessage" name="closedMessage" rows={2} defaultValue={s.closedMessage} />
          </div>
          <div className="w-48">
            <label className="label" htmlFor="leadTimeHours">Délai minimum avant retrait (heures)</label>
            <input className="input" id="leadTimeHours" name="leadTimeHours" type="number" min={0} defaultValue={s.leadTimeHours} />
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="font-display text-2xl">Emails</h2>
          <div>
            <label className="label" htmlFor="notifyEmail">Recevoir les nouvelles commandes à</label>
            <input className="input" id="notifyEmail" name="notifyEmail" type="email" defaultValue={s.notifyEmail} placeholder="commandes@exemple.fr" />
          </div>
          {!smtpReady && (
            <p className="rounded-md bg-orange-50 p-3 text-sm text-orange-800">
              L&apos;envoi d&apos;emails n&apos;est pas configuré (variables SMTP_* manquantes) : aucun email ne part pour l&apos;instant.
            </p>
          )}
        </section>

        <section className="card space-y-4">
          <h2 className="font-display text-2xl">Modes de paiement</h2>
          <div className="space-y-2">
            <Check name="paymentStripe" label="Carte bancaire en ligne (Stripe)" checked={s.paymentStripe === "true"} />
            {!stripeReady && <p className="pl-6 text-xs text-orange-700">STRIPE_SECRET_KEY manquant : ce mode est masqué.</p>}
            {stripeReady && !webhookReady && (
              <p className="pl-6 text-xs text-orange-700">STRIPE_WEBHOOK_SECRET manquant : les paiements sont vérifiés uniquement au retour du client.</p>
            )}
            <Check name="paymentTransfer" label="Virement bancaire" checked={s.paymentTransfer === "true"} />
            <Check name="paymentCash" label="Espèces au retrait" checked={s.paymentCash === "true"} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="bankHolder">Titulaire du compte</label>
              <input className="input" id="bankHolder" name="bankHolder" defaultValue={s.bankHolder} />
            </div>
            <div>
              <label className="label" htmlFor="bankIban">IBAN</label>
              <input className="input font-semibold" id="bankIban" name="bankIban" defaultValue={s.bankIban} />
            </div>
            <div>
              <label className="label" htmlFor="bankBic">BIC</label>
              <input className="input font-semibold" id="bankBic" name="bankBic" defaultValue={s.bankBic} />
            </div>
          </div>
          <p className="text-xs text-chocolat/75">Le virement n&apos;est proposé aux clients que si un IBAN est renseigné.</p>
        </section>

        <SubmitButton>Enregistrer</SubmitButton>
      </ActionForm>
    </div>
  );
}
