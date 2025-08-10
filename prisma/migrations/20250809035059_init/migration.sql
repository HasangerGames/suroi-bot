-- CreateEnum
CREATE TYPE "public"."CaseType" AS ENUM ('WARNING', 'TIMEOUT', 'KICK', 'BAN');

-- CreateTable
CREATE TABLE "public"."User" (
    "userId" TEXT NOT NULL,
    "xp" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xpToNextLevel" DECIMAL(65,30) NOT NULL DEFAULT 1.0
);

-- CreateTable
CREATE TABLE "public"."Case" (
    "id" SERIAL NOT NULL,
    "type" "public"."CaseType" NOT NULL,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_userId_key" ON "public"."User"("userId");

-- AddForeignKey
ALTER TABLE "public"."Case" ADD CONSTRAINT "Case_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
