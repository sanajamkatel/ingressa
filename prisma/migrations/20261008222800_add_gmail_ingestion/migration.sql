-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "gmailMessageId" TEXT;

-- CreateTable
CREATE TABLE "EmailSyncState" (
    "userId" TEXT NOT NULL,
    "historyId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSyncState_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Application_userId_gmailMessageId_key" ON "Application"("userId", "gmailMessageId");
