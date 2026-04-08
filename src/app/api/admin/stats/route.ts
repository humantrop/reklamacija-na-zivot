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
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [totalUsers, stats, categoryStats] = await Promise.all([
    prisma.user.count(),
    prisma.stats.findUnique({ where: { id: "global" } }),
    prisma.categoryStat.findMany({ orderBy: { usageCount: "desc" } }),
  ]);

  return NextResponse.json({
    totalUsers,
    totalChatsCreated: stats?.totalChatsCreated ?? 0,
    totalMessages: stats?.totalMessages ?? 0,
    soloChats: stats?.soloChats ?? 0,
    groupChats: stats?.groupChats ?? 0,
    categoryStats: categoryStats.map((c) => ({
      id: c.id,
      label: c.label,
      count: c.usageCount,
    })),
  });
}
