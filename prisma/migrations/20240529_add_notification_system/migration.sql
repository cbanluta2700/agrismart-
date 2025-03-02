-- Add notification preferences to User model
ALTER TABLE "User" ADD COLUMN "notificationPreferences" TEXT;

-- Update Notification model
DROP TABLE IF EXISTS "notifications";

-- Create new Notification model with improved fields
CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "data" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Create necessary indexes for Notification model
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_type_idx" ON "Notification"("type");
CREATE INDEX "Notification_read_idx" ON "Notification"("read");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- Add batch ID to ResourceModerationLog
ALTER TABLE "ResourceModerationLog" ADD COLUMN "batchId" TEXT;
CREATE INDEX "ResourceModerationLog_batchId_idx" ON "ResourceModerationLog"("batchId");

-- Add foreign key constraint for Notification
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
