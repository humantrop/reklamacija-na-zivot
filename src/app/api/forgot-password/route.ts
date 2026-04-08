import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email je obavezan" },
        { status: 400 }
      );
    }

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Invalidate any existing tokens for this email
      await prisma.passwordReset.updateMany({
        where: { email, used: false },
        data: { used: true },
      });

      // Create new token (valid 1 hour)
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.passwordReset.create({
        data: {
          email,
          token,
          expiresAt: new Date(Date.now() + 3600000), // 1 hour
        },
      });

      try {
        await sendPasswordResetEmail(email, token);
      } catch (e) {
        console.error("Failed to send reset email:", e);
        return NextResponse.json(
          { error: "Greška pri slanju emaila. Pokušaj ponovo." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      message: "Ako nalog postoji, link za reset je poslat na email.",
    });
  } catch {
    return NextResponse.json(
      { error: "Greška na serveru" },
      { status: 500 }
    );
  }
}
