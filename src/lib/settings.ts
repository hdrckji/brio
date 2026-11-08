import { db } from "./db";

export const SETTING_DEFAULTS = {
  shopName: "Biscotte",
  shopTagline: "Biscuits et douceurs de Noël, à commander en ligne et à retirer en point de retrait.",
  shopOpen: "true",
  closedMessage: "Les commandes sont fermées pour le moment. Revenez bientôt !",
  leadTimeHours: "24",
  notifyEmail: "",
  bankHolder: "",
  bankIban: "",
  bankBic: "",
  paymentStripe: "true",
  paymentTransfer: "true",
  paymentCash: "true",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type Settings = Record<SettingKey, string>;

export async function getSettings(): Promise<Settings> {
  const rows = await db.setting.findMany();
  const out = { ...SETTING_DEFAULTS } as Settings;
  for (const r of rows) {
    if (r.key in out) out[r.key as SettingKey] = r.value;
  }
  return out;
}

export async function saveSettings(values: Partial<Settings>) {
  await db.$transaction(
    Object.entries(values).map(([key, value]) =>
      db.setting.upsert({ where: { key }, create: { key, value: value ?? "" }, update: { value: value ?? "" } }),
    ),
  );
}

export function enabledPaymentMethods(s: Settings) {
  const methods: ("STRIPE" | "TRANSFER" | "CASH")[] = [];
  if (s.paymentStripe === "true" && process.env.STRIPE_SECRET_KEY) methods.push("STRIPE");
  if (s.paymentTransfer === "true" && s.bankIban) methods.push("TRANSFER");
  if (s.paymentCash === "true") methods.push("CASH");
  return methods;
}
