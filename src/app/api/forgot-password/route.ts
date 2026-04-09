import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { isRateLimited } from "@/lib/rate-limit";

// Minimum response time to prevent timing-based email enumeration
const MIN_RESPONSE_MS = 1500;

export async function POST(request: Request) {
  const start = Date.now();
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip, { maxAttempts: 3, windowMs: 3600_000 })) {
      return NextResponse.json(
        { error: "Previše pokušaja. Sačekaj malo pa probaj ponovo." },
        { status: 429 }
      );
    }

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email je obavezan" },
        { status: 400 }
      );
    }

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
        // Don't leak failure — still return success after delay
      }
    }

    // Ensure constant response time regardless of user existence
    const elapsed = Date.now() - start;
    if (elapsed < MIN_RESPONSE_MS) {
      await new Promise((r) => setTimeout(r, MIN_RESPONSE_MS - elapsed));
    }

    return NextResponse.json({
      message: "Ako nalog postoji, link za reset je poslat na email.",
    });
  } catch {
    const elapsed = Date.now() - start;
    if (elapsed < MIN_RESPONSE_MS) {
      await new Promise((r) => setTimeout(r, MIN_RESPONSE_MS - elapsed));
    }
    return NextResponse.json(
      { error: "Greška na serveru" },
      { status: 500 }
    );
  }
}
