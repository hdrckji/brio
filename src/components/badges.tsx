import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/generated/prisma/client";
import { ORDER_STATUS_LABELS, PAYMENT_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/format";

const STATUS_COLORS: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "bg-gray-100 text-gray-700",
  CONFIRMED: "bg-blue-50 text-blue-800",
  READY: "bg-amber-50 text-amber-800",
  PICKED_UP: "bg-green-50 text-green-800",
  CANCELLED: "bg-red-50 text-red-700",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>{ORDER_STATUS_LABELS[status]}</span>;
}

export function PaymentBadge({ method, status }: { method: PaymentMethod; status: PaymentStatus }) {
  const short = { STRIPE: "Carte", TRANSFER: "Virement", CASH: "Espèces" }[method];
  const color = status === "PAID" ? "bg-green-50 text-green-800" : status === "REFUNDED" ? "bg-gray-100 text-gray-700" : "bg-orange-50 text-orange-800";
  return (
    <span title={PAYMENT_LABELS[method]} className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {short} {PAYMENT_STATUS_LABELS[status].toLowerCase()}
    </span>
  );
}
