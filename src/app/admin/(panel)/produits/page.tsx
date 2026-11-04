import Link from "next/link";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

export default async function ProductsPage() {
  const products = await db.product.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, priceCents: true, active: true, imageMime: true, imageVersion: true, sortOrder: true },
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-5xl leading-none">Produits</h1>
        <Link href="/admin/produits/nouveau" className="btn">+ Nouveau produit</Link>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-givre text-left text-sapin/70">
            <tr>
              <th className="px-4 py-2">Photo</th>
              <th className="px-4 py-2">Nom</th>
              <th className="px-4 py-2 text-right">Prix</th>
              <th className="px-4 py-2">Ordre</th>
              <th className="px-4 py-2">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sapin/10">
            {products.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-sapin/75">Aucun produit. Commencez par en créer un.</td></tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-givre/50">
                <td className="px-4 py-2">
                  {p.imageMime ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/products/${p.id}/image?v=${p.imageVersion}`} alt="" className="h-10 w-14 rounded object-cover" />
                  ) : (
                    <div className="flex h-10 w-14 items-center justify-center rounded bg-givre">🎄</div>
                  )}
                </td>
                <td className="px-4 py-2">
                  <Link href={`/admin/produits/${p.id}`} className="font-medium text-airelle hover:underline">{p.name}</Link>
                </td>
                <td className="px-4 py-2 text-right">{formatPrice(p.priceCents)}</td>
                <td className="px-4 py-2">{p.sortOrder}</td>
                <td className="px-4 py-2">
                  {p.active ? <span className="text-green-700">En vente</span> : <span className="text-sapin/65">Masqué</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
