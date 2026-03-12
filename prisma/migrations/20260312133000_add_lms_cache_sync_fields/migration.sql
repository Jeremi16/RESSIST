ALTER TABLE "users" ADD COLUMN "lms_last_synced_at" TIMESTAMP(3);

ALTER TABLE "events" ADD COLUMN "sync_key" TEXT;

UPDATE "events"
SET "sync_key" = CONCAT('legacy-', "id")
WHERE "sync_key" IS NULL OR "sync_key" = '';

ALTER TABLE "events" ALTER COLUMN "sync_key" SET NOT NULL;

CREATE UNIQUE INDEX "events_user_id_sync_key_key" ON "events"("user_id", "sync_key");
