import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/rate-limit";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip, { maxAttempts: 5, windowMs: 3600_000 })) {
      return NextResponse.json(
        { error: "Previše pokušaja. Sačekaj malo pa probaj ponovo." },
        { status: 429 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email i lozinka su obavezni" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Lozinka mora imati najmanje 6 karaktera" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Korisnik sa ovim email-om već postoji" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    sendWelcomeEmail(email).catch((err) => {
      console.error("Failed to send welcome email:", err);
    });

    return NextResponse.json(
      { message: "Registracija uspešna" },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Greška pri registraciji" },
      { status: 500 }
    );
  }
}
