import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  try {
    // Delete all user-related data
    await prisma.$transaction([
      prisma.rating.deleteMany({ where: { OR: [{ raterId: userId }, { ratedId: userId }] } }),
      prisma.report.deleteMany({ where: { OR: [{ reporterId: userId }, { reportedId: userId }] } }),
      prisma.connection.deleteMany({ where: { OR: [{ user1Id: userId }, { user2Id: userId }] } }),
      prisma.passwordReset.deleteMany({ where: { email: (session.user as { email: string }).email } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return NextResponse.json({ message: "Nalog je obrisan" });
  } catch {
    return NextResponse.json(
      { error: "Greška pri brisanju naloga" },
      { status: 500 }
    );
  }
}
