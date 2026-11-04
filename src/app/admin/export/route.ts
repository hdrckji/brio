import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ORDER_STATUS_LABELS, PAYMENT_LABELS, PAYMENT_STATUS_LABELS, formatDateTime, formatTime, itemLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

const cell = (v: string | number) => {
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  if (!(await isAdmin())) return new Response("Non autorisé", { status: 401 });
  const orders = await db.order.findMany({
    where: { status: { not: "CANCELLED" } },
    include: { items: true, pickupSlot: { include: { pickupPoint: true } } },
    orderBy: { pickupSlot: { startsAt: "asc" } },
  });
  const header = ["Référence", "Retrait", "Fin", "Point", "Client", "Email", "Téléphone", "Articles", "Total (€)", "Paiement", "Statut paiement", "Statut", "Note"];
  const rows = orders.map((o) => [
    o.reference,
    formatDateTime(o.pickupSlot.startsAt),
    formatTime(o.pickupSlot.endsAt),
    o.pickupSlot.pickupPoint.name,
    o.customerName,
    o.email,
    o.phone,
    o.items.map((i) => `${i.quantity}x ${itemLabel(i)}`).join(", "),
    (o.totalCents / 100).toFixed(2).replace(".", ","),
    PAYMENT_LABELS[o.paymentMethod],
    PAYMENT_STATUS_LABELS[o.paymentStatus],
    ORDER_STATUS_LABELS[o.status],
    o.note,
  ]);
  // BOM + point-virgule pour une ouverture correcte dans Excel (FR)
  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="commandes-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
