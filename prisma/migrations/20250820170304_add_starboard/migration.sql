-- CreateTable
CREATE TABLE "public"."StarboardMessage" (
    "originalMessageId" TEXT NOT NULL,
    "starboardMessageId" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "StarboardMessage_originalMessageId_key" ON "public"."StarboardMessage"("originalMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "StarboardMessage_starboardMessageId_key" ON "public"."StarboardMessage"("starboardMessageId");
