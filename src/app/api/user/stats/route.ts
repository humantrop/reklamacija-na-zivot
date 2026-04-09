import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as { id: string }).id },
    select: { totalChats: true, avgRating: true, totalRatings: true },
  });

  const totalChats = user?.totalChats ?? 0;
  const avgRating = user?.avgRating ?? 0;
  const canListen = totalChats >= 10 && avgRating >= 4;

  return NextResponse.json({ totalChats, avgRating, canListen });
}
