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
    <>
      <section className="pb-10 sm:pb-14">
        <h1 className="-ml-1 font-display text-[clamp(6rem,24vw,13rem)] leading-[0.8] tracking-tight">{settings.shopName}</h1>
        <p className="mt-6 max-w-xl text-xl leading-snug sm:text-2xl">{settings.shopTagline}</p>
        <p className="mt-3 max-w-xl text-cerise/75">
          Commandez au plus tard {settings.leadTimeHours} heures avant le retrait, puis passez chercher votre commande au point de retrait choisi.
        </p>
      </section>

      {!open && <p className="mb-10 rounded-lg bg-kraft/40 px-5 py-4 text-lg">{settings.closedMessage}</p>}

      <section aria-labelledby="carte">
        <h2 id="carte" className="border-b-2 border-cerise pb-2 font-display text-4xl">
          La carte de Noël
        </h2>
        {products.length === 0 ? (
          <p className="py-8 text-cerise/75">La carte de Noël arrive bientôt.</p>
        ) : (
          <ul className="divide-y divide-cerise/15">
            {products.map((p) => (
              <li key={p.id} className={`grid gap-x-6 gap-y-4 py-7 ${hasImages ? "sm:grid-cols-[9rem_1fr]" : ""}`}>
                {p.imageMime ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/products/${p.id}/image?v=${p.imageVersion}`}
                    alt=""
                    className="aspect-square w-full max-w-[9rem] rounded-full object-cover"
                  />
                ) : (
                  hasImages && <div className="hidden sm:block" />
                )}
                <div className="min-w-0">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:gap-0">
                    <h3 className="font-display text-[2rem] leading-none">{p.name}</h3>
                    <span className="leader hidden sm:block" aria-hidden />
                    <span className="text-lg font-semibold text-sapin">{formatPrice(p.priceCents)}</span>
                  </div>
                  {p.description && <p className="mt-2 max-w-prose whitespace-pre-line text-cerise/80">{p.description}</p>}
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
    </>
  );
}
