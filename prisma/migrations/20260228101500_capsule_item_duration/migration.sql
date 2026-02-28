ALTER TABLE "capsule"
ADD COLUMN "item_duration_mode" TEXT NOT NULL DEFAULT 'auto';

ALTER TABLE "capsule"
ADD COLUMN "item_duration_sec" REAL;
