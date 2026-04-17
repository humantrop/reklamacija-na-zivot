import { Resend } from "resend";

let resend: Resend | null = null;

function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM = "Sve će biti OK <noreply@svecebitiok.rs>";

function getBaseUrl() {
  const baseUrl = (process.env.NEXTAUTH_URL || "").replace(/\/+$/, "");
  if (!baseUrl) throw new Error("NEXTAUTH_URL is not configured");
  return baseUrl;
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${getBaseUrl()}/reset-password?token=${token}`;

  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Reset lozinke",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0b1120; color: #e2e8f0; border-radius: 16px;">
        <h2 style="color: #3b82f6; margin-bottom: 16px;">Reset lozinke</h2>
        <p style="color: #94a3b8; line-height: 1.6;">
          Primili smo zahtev za promenu lozinke tvog naloga. Klikni na dugme ispod da postaviš novu lozinku.
        </p>
        <a href="${resetUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 32px; background: #3b82f6; color: white; text-decoration: none; border-radius: 12px; font-weight: 600;">
          Promeni lozinku
        </a>
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
          Link važi 1 sat. Ako nisi ti tražio/la promenu lozinke, ignoriši ovaj email.
        </p>
        <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="color: #64748b; font-size: 12px;">Sve će biti OK</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(to: string) {
  const dashboardUrl = `${getBaseUrl()}/dashboard`;

  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Dobrodošao/la na Sve će biti OK 💬",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0b1120; color: #e2e8f0; border-radius: 16px;">
        <h2 style="color: #3b82f6; margin-bottom: 16px;">Drago nam je što si tu</h2>
        <p style="color: #94a3b8; line-height: 1.6;">
          Hvala što si napravio/la nalog na <strong style="color: #e2e8f0;">Sve će biti OK</strong>.
          Ovde možeš anonimno da porazgovaraš sa nekim ko te razume — bez imena, bez osude, bez tragova.
        </p>
        <p style="color: #94a3b8; line-height: 1.6;">
          Nalog ti otključava značke, statistiku i zadržavanje razgovora sa ljudima sa kojima klikne.
        </p>
        <a href="${dashboardUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 32px; background: #3b82f6; color: white; text-decoration: none; border-radius: 12px; font-weight: 600;">
          Počni razgovor
        </a>
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
          Ako nekad zatreba — tu smo. Sve će biti OK.
        </p>
        <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="color: #64748b; font-size: 12px;">Sve će biti OK</p>
      </div>
    `,
  });
}

export async function sendGoodbyeEmail(to: string) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Žao nam je što odlaziš 💔",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0b1120; color: #e2e8f0; border-radius: 16px;">
        <h2 style="color: #3b82f6; margin-bottom: 16px;">Žao nam je što odlaziš</h2>
        <p style="color: #94a3b8; line-height: 1.6;">
          Tvoj nalog je uspešno obrisan, zajedno sa svim podacima. Hvala ti što si bio/la deo zajednice.
        </p>
        <p style="color: #94a3b8; line-height: 1.6;">
          Nadamo se da ćemo se ponovo videti. Vrata su ti uvek otvorena — kad god zatreba da se ispričaš.
        </p>
        <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="color: #64748b; font-size: 12px;">Sve će biti OK</p>
      </div>
    `,
  });
}
