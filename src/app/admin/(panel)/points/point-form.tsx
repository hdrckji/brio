import { ActionForm, SubmitButton } from "@/components/action-form";
import { savePickupPoint } from "../../actions";

type Point = { id: string; name: string; address: string; details: string; sortOrder: number; active: boolean };

export function PointForm({ point }: { point?: Point }) {
  return (
    <ActionForm action={savePickupPoint} className="card space-y-4">
      {point && <input type="hidden" name="id" value={point.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Nom</label>
          <input className="input" id="name" name="name" required defaultValue={point?.name} placeholder="Boulangerie — centre-ville" />
        </div>
        <div>
          <label className="label" htmlFor="address">Adresse</label>
          <input className="input" id="address" name="address" required defaultValue={point?.address} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="details">Infos pratiques (facultatif)</label>
        <textarea className="input" id="details" name="details" rows={2} defaultValue={point?.details} placeholder="Entrée par la cour, parking…" />
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <div className="w-32">
          <label className="label" htmlFor="sortOrder">Ordre</label>
          <input className="input" id="sortOrder" name="sortOrder" type="number" defaultValue={point?.sortOrder ?? 0} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={point?.active ?? true} className="accent-berry" /> Actif
        </label>
      </div>
      <SubmitButton>{point ? "Enregistrer" : "Créer le point de retrait"}</SubmitButton>
    </ActionForm>
  );
}
