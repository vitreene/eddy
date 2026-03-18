ALTER TABLE "scene_content" ADD COLUMN "timestamp" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "scene_content" ADD COLUMN "totalDuration" REAL NOT NULL DEFAULT 5;

UPDATE "scene_content"
SET "timestamp" = "events"
WHERE "timestamp" = '[]' AND "events" IS NOT NULL AND TRIM("events") != '';
