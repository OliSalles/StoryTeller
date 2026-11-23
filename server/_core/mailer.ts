import sgMail from "@sendgrid/mail";
import { ENV } from "./env";

export function isMailConfigured(): boolean {
  return Boolean(ENV.sendgridApiKey && ENV.mailFrom);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Envia pelo SendGrid. Sem SendGrid configurado só registra no console. Retorna se o email saiu. */
export async function sendMail(msg: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
  if (!isMailConfigured()) {
    console.log(`[Mail] SendGrid não configurado. Email para ${msg.to} não enviado:\n${msg.text}`);
    return false;
  }
  try {
    sgMail.setApiKey(ENV.sendgridApiKey);
    await sgMail.send({ ...msg, from: ENV.mailFrom });
    console.log(`[Mail] "${msg.subject}" enviado para ${msg.to}`);
    return true;
  } catch (err) {
    console.error(`[Mail] Falha ao enviar "${msg.subject}" para ${msg.to}:`, err);
    return false;
  }
}
