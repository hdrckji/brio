import type Stripe from "stripe";
import { db } from "@/lib/db";
import { markStripeOrderPaid } from "@/lib/orders";
import { getStripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook non configuré", { status: 500 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return new Response("Signature invalide", { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    if (orderId && session.payment_status === "paid") await markStripeOrderPaid(orderId, session.id);
  } else if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    await db.order.updateMany({
      where: { stripeSessionId: session.id, status: "AWAITING_PAYMENT" },
      data: { status: "CANCELLED" },
    });
  }

  return Response.json({ received: true });
}
