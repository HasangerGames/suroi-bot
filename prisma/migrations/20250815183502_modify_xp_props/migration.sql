/*
  Warnings:

  - You are about to drop the column `level` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `xpToNextLevel` on the `User` table. All the data in the column will be lost.
  - You are about to alter the column `xp` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Integer`.

*/
-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "level",
DROP COLUMN "xpToNextLevel",
ALTER COLUMN "xp" SET DEFAULT 0,
ALTER COLUMN "xp" SET DATA TYPE INTEGER;
