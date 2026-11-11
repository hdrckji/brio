import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
  }
  return transporter;
}

/** Envoie un email et laisse remonter l'erreur SMTP (utilisé par le mail test de l'admin). */
export async function deliverEmail(to: string, subject: string, html: string) {
  const t = getTransporter();
  if (!t) throw new Error("SMTP non configuré : la variable SMTP_HOST est vide sur le serveur.");
  await t.sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to, subject, html });
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!to) return;
  if (!getTransporter()) {
    console.log(`[email non envoyé — SMTP non configuré] À: ${to} | Sujet: ${subject}`);
    return;
  }
  try {
    await deliverEmail(to, subject, html);
  } catch (err) {
    // Un email en échec ne doit jamais bloquer une commande.
    console.error("Échec d'envoi d'email", { to, subject, err });
  }
}
