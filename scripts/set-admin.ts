import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const email = process.argv[2];
if (!email) {
  console.error("Usage: tsx scripts/set-admin.ts <email>");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Reset all admins to USER first
  await prisma.user.updateMany({ where: { role: "ADMIN" }, data: { role: "USER" } });

  // Set the specified user as ADMIN
  const user = await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" },
  });

  console.log(`${user.email} je sada jedini ADMIN.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
