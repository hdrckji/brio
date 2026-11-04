import { ActionForm, SubmitButton } from "@/components/action-form";
import { saveProduct } from "../../actions";

type Product = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  sortOrder: number;
  active: boolean;
  imageMime: string | null;
  imageVersion: number;
};

export function ProductForm({ product }: { product?: Product }) {
  return (
    <ActionForm action={saveProduct} className="card max-w-2xl space-y-4">
      {product && <input type="hidden" name="id" value={product.id} />}
      <div>
        <label className="label" htmlFor="name">Nom</label>
        <input className="input" id="name" name="name" required defaultValue={product?.name} />
      </div>
      <div>
        <label className="label" htmlFor="description">Description</label>
        <textarea className="input" id="description" name="description" rows={4} defaultValue={product?.description} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="price">Prix (€)</label>
          <input
            className="input"
            id="price"
            name="price"
            inputMode="decimal"
            required
            placeholder="12,50"
            defaultValue={product ? (product.priceCents / 100).toFixed(2).replace(".", ",") : ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="sortOrder">Ordre d&apos;affichage</label>
          <input className="input" id="sortOrder" name="sortOrder" type="number" defaultValue={product?.sortOrder ?? 0} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="image">Photo</label>
        {product?.imageMime && (
          <div className="mb-2 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/products/${product.id}/image?v=${product.imageVersion}`} alt="" className="h-24 w-32 rounded object-cover" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="removeImage" className="accent-sapin" /> Supprimer la photo
            </label>
          </div>
        )}
        <input className="input" id="image" name="image" type="file" accept="image/*" />
        <p className="mt-1 text-xs text-cerise/75">JPG, PNG ou WebP, 5 Mo maximum.</p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="accent-sapin" />
        En vente sur le site
      </label>
      <SubmitButton>{product ? "Enregistrer" : "Créer le produit"}</SubmitButton>
    </ActionForm>
  );
}
