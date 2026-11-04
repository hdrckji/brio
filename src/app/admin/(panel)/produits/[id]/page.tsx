import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/action-form";
import { db } from "@/lib/db";
import { deleteProduct } from "../../../actions";
import { ProductForm } from "../product-form";

export default async function EditProduct({ params }: PageProps<"/admin/produits/[id]">) {
  const { id } = await params;
  if (id === "nouveau") {
    return (
      <div className="space-y-4">
        <Link href="/admin/produits" className="text-sm text-sapin/75 hover:text-sapin">Tous les produits</Link>
        <h1 className="font-display text-5xl leading-none">Nouveau produit</h1>
        <ProductForm />
      </div>
    );
  }
  const product = await db.product.findUnique({
    where: { id },
    select: { id: true, name: true, description: true, priceCents: true, sortOrder: true, active: true, imageMime: true, imageVersion: true },
  });
  if (!product) notFound();
  return (
    <div className="space-y-4">
      <Link href="/admin/produits" className="text-sm text-sapin/75 hover:text-sapin">Tous les produits</Link>
      <h1 className="font-display text-5xl leading-none">{product.name}</h1>
      <ProductForm product={product} />
      <form action={deleteProduct} className="max-w-2xl">
        <input type="hidden" name="id" value={product.id} />
        <ConfirmButton message="Supprimer définitivement ce produit ? (Les commandes passées gardent leur détail.) Pour simplement le retirer du site, décochez « En vente ».">
          Supprimer le produit
        </ConfirmButton>
      </form>
    </div>
  );
}
