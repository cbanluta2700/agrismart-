-- CreateTable
CREATE TABLE "moderation_appeal_notifications" (
    "id" TEXT NOT NULL,
    "appealId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_appeal_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "moderation_appeal_notifications_appealId_idx" ON "moderation_appeal_notifications"("appealId");

-- CreateIndex
CREATE INDEX "moderation_appeal_notifications_userId_idx" ON "moderation_appeal_notifications"("userId");

-- CreateIndex
CREATE INDEX "moderation_appeal_notifications_read_idx" ON "moderation_appeal_notifications"("read");

-- AddForeignKey
ALTER TABLE "moderation_appeal_notifications" ADD CONSTRAINT "moderation_appeal_notifications_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "moderation_appeals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_appeal_notifications" ADD CONSTRAINT "moderation_appeal_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
