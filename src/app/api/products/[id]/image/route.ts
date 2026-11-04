import { db } from "@/lib/db";

export async function GET(_req: Request, ctx: RouteContext<"/api/products/[id]/image">) {
  const { id } = await ctx.params;
  const product = await db.product.findUnique({ where: { id }, select: { imageData: true, imageMime: true } });
  if (!product?.imageData || !product.imageMime) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(product.imageData), {
    headers: {
      "Content-Type": product.imageMime,
      // l'URL contient ?v=<version>, on peut donc mettre en cache longtemps
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
