-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER',
ADD COLUMN     "totalChats" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Stats" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "totalChatsCreated" INTEGER NOT NULL DEFAULT 0,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stats_pkey" PRIMARY KEY ("id")
);
