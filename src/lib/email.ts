import { Resend } from "resend";

let resend: Resend | null = null;

function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  await getResend().emails.send({
    from: "Reklamacija na Život <onboarding@resend.dev>",
    to,
    subject: "Reset lozinke",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a12; color: #e2e8f0; border-radius: 16px;">
        <h2 style="color: #8b5cf6; margin-bottom: 16px;">Reset lozinke</h2>
        <p style="color: #94a3b8; line-height: 1.6;">
          Primili smo zahtev za promenu lozinke tvog naloga. Klikni na dugme ispod da postaviš novu lozinku.
        </p>
        <a href="${resetUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 32px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 12px; font-weight: 600;">
          Promeni lozinku
        </a>
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
          Link važi 1 sat. Ako nisi ti tražio/la promenu lozinke, ignoriši ovaj email.
        </p>
        <hr style="border: none; border-top: 1px solid #1e1e3f; margin: 24px 0;" />
        <p style="color: #64748b; font-size: 12px;">Reklamacija na Život</p>
      </div>
    `,
  });
}
