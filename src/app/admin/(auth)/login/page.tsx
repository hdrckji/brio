import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { isAdmin } from "@/lib/auth";
import { login } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Connexion, administration Brio" };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <ActionForm action={login} className="card w-full max-w-sm space-y-4">
        <h1 className="font-display text-4xl">Administration</h1>
        <div>
          <label className="label" htmlFor="password">Mot de passe</label>
          <input className="input" id="password" name="password" type="password" required autoFocus />
        </div>
        <SubmitButton className="btn w-full">Se connecter</SubmitButton>
      </ActionForm>
    </div>
  );
}
