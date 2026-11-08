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
      select: {
        id: true,
        name: true,
        description: true,
        priceCents: true,
        imageMime: true,
        imageVersion: true,
        variants: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, priceCents: true } },
      },
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
        <Image src="/ornement-noeud-biscotte.png" alt="" width={263} height={62} className="mx-auto mt-8 w-44" />
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
              <li key={p.id} className={`grid gap-x-8 gap-y-5 py-8 ${hasImages ? "sm:grid-cols-[15rem_1fr]" : ""}`}>
                {p.imageMime ? (
                  <div className="cadre-photo">
                    {/* eslint-disable-next-line @next/next/no-img-element -- image servie depuis la base, déjà mise en cache */}
                    <img
                      src={`/api/products/${p.id}/image?v=${p.imageVersion}`}
                      alt={p.name}
                      loading="lazy"
                      className="aspect-[3/2] w-full rounded-xl bg-white object-contain"
                    />
                  </div>
                ) : (
                  hasImages && (
                    // Pas encore de photo : l'illustration gravée du logo, pour garder la carte alignée
                    <div className="cadre-photo hidden sm:block">
                      <Image src="/illustration-biscotte.webp" alt="" width={582} height={388} className="aspect-[3/2] w-full rounded-xl object-contain" />
                    </div>
                  )
                )}
                <div className="min-w-0">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:gap-0">
                    <h3 className="font-display text-2xl leading-tight">{p.name}</h3>
                    <span className="leader hidden sm:block" aria-hidden />
                    <span className="text-lg font-medium whitespace-nowrap text-pervenche">{priceLabel(p)}</span>
                  </div>
                  {p.description && <p className="mt-1 max-w-prose whitespace-pre-line text-chocolat/80">{p.description}</p>}
                  {open && (
                    <div className="mt-4">
                      <AddToCart productId={p.id} name={p.name} priceCents={p.priceCents} variants={variantsOf(p)} />
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

type ProductWithVariants = { priceCents: number; variants: { id: string; name: string; priceCents: number | null }[] };

/** Prix effectif de chaque déclinaison (son prix propre, sinon celui du produit). */
function variantsOf(p: ProductWithVariants) {
  return p.variants.map((v) => ({ id: v.id, name: v.name, priceCents: v.priceCents ?? p.priceCents }));
}

function priceLabel(p: ProductWithVariants) {
  const prices = variantsOf(p).map((v) => v.priceCents);
  if (prices.length === 0) return formatPrice(p.priceCents);
  const min = Math.min(...prices);
  return Math.max(...prices) > min ? `dès ${formatPrice(min)}` : formatPrice(min);
}
