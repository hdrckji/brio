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

  return (
    <div className="space-y-8">
      <section className="text-center">
        <h1 className="font-serif text-4xl font-bold text-ink sm:text-5xl">{settings.shopName}</h1>
        <p className="mt-3 text-lg text-ink/70">{settings.shopTagline}</p>
        <p className="mt-2 text-sm text-pine">Commande au moins {settings.leadTimeHours} h à l&apos;avance · Retrait en point de retrait</p>
      </section>

      {!open && <div className="card border-gold/40 bg-gold/10 text-center">{settings.closedMessage}</div>}

      {products.length === 0 ? (
        <p className="text-center text-ink/60">Aucun produit pour le moment.</p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.id} className="card flex flex-col overflow-hidden p-0">
              <div className="aspect-[4/3] bg-cream">
                {p.imageMime ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/products/${p.id}/image?v=${p.imageVersion}`} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl">🎄</div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-serif text-xl font-semibold">{p.name}</h2>
                  <span className="whitespace-nowrap font-semibold text-berry">{formatPrice(p.priceCents)}</span>
                </div>
                {p.description && <p className="flex-1 whitespace-pre-line text-sm text-ink/70">{p.description}</p>}
                {open && <AddToCart productId={p.id} name={p.name} priceCents={p.priceCents} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
