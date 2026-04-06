import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true },
  });

  console.log("Korisnici u bazi:");
  users.forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.email} (role: ${u.role})`);
  });

  if (users.length === 0) {
    console.log("  Nema korisnika u bazi.");
    await prisma.$disconnect();
    return;
  }

  // Make the first user admin
  const firstUser = users[0];
  if (firstUser.role === "ADMIN") {
    console.log(`\n${firstUser.email} je već ADMIN.`);
  } else {
    await prisma.user.update({
      where: { id: firstUser.id },
      data: { role: "ADMIN" },
    });
    console.log(`\n${firstUser.email} je sada ADMIN!`);
  }

  // Also ensure global stats exist
  await prisma.stats.upsert({
    where: { id: "global" },
    create: { id: "global", totalChatsCreated: 0, totalMessages: 0 },
    update: {},
  });
  console.log("Global stats inicijalizovane.");

  await prisma.$disconnect();
}

main().catch(console.error);
