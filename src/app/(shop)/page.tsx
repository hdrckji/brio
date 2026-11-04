import Image from "next/image";
import { AddToCart } from "@/components/add-to-cart";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export default async function HomePage() {
  const [settings, products] = await Promise.all([
    getSettings(),
    db.product.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, description: true, priceCents: true, imageMime: true, imageVersion: true },
    }),
  ]);
  const open = settings.shopOpen === "true";
  // Colonne photo seulement si au moins un produit en a une, pour garder la carte alignée
  const hasImages = products.some((p) => p.imageMime);

  return (
    <div className="mx-auto max-w-2xl">
      {/* place pour le médaillon qui déborde de la bande rayée */}
      <section className="pt-20 text-center sm:pt-28">
        <h1 className="font-display text-2xl leading-snug text-balance sm:text-4xl sm:leading-tight">{settings.shopTagline}</h1>
        <p className="mx-auto mt-4 max-w-md text-chocolat/80">
          Commandez au plus tard {settings.leadTimeHours} heures avant le retrait, puis passez chercher votre commande au point de retrait choisi.
        </p>
        <Image src="/ornement-noeud.png" alt="" width={270} height={70} className="mx-auto mt-8 w-44" />
      </section>

      {!open && <p className="mt-10 rounded-lg border-2 border-dotted border-cacao/50 px-5 py-4 text-center text-lg">{settings.closedMessage}</p>}

      <section aria-labelledby="carte" className="mt-12">
        <h2 id="carte" className="text-center font-display text-4xl">
          La carte de Noël
        </h2>
        {products.length === 0 ? (
          <p className="py-8 text-center text-chocolat/75">La carte de Noël arrive bientôt.</p>
        ) : (
          <ul className="mt-6 divide-y divide-cacao/20 border-y border-cacao/20">
            {products.map((p) => (
              <li key={p.id} className={`grid gap-x-6 gap-y-4 py-7 ${hasImages ? "sm:grid-cols-[8rem_1fr]" : ""}`}>
                {p.imageMime ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/products/${p.id}/image?v=${p.imageVersion}`}
                    alt=""
                    className="medaillon aspect-square w-full max-w-[8rem] object-cover"
                  />
                ) : (
                  hasImages && <div className="hidden sm:block" />
                )}
                <div className="min-w-0">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:gap-0">
                    <h3 className="font-display text-2xl leading-tight">{p.name}</h3>
                    <span className="leader hidden sm:block" aria-hidden />
                    <span className="text-lg font-medium text-pervenche">{formatPrice(p.priceCents)}</span>
                  </div>
                  {p.description && <p className="mt-1 max-w-prose whitespace-pre-line text-chocolat/80">{p.description}</p>}
                  {open && (
                    <div className="mt-4">
                      <AddToCart productId={p.id} name={p.name} priceCents={p.priceCents} />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
