PRAGMA foreign_keys=OFF;

ALTER TABLE "content" ADD COLUMN "timestamp" TEXT NOT NULL DEFAULT '[]';

UPDATE "content"
SET "timestamp" = (
  SELECT "timestamp"
  FROM "scene_content"
  WHERE "scene_content"."content_id" = "content"."id"
  ORDER BY "scene_content"."id" DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM "scene_content"
  WHERE "scene_content"."content_id" = "content"."id"
    AND "scene_content"."timestamp" IS NOT NULL
    AND TRIM("scene_content"."timestamp") != ''
);

CREATE TABLE "new_scene_content" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "order" INTEGER NOT NULL,
  "events" TEXT NOT NULL DEFAULT '[]',
  "content_id" INTEGER NOT NULL,
  "scene_id" INTEGER NOT NULL,
  "decor_id" INTEGER,
  CONSTRAINT "scene_content_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "scene_content_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scene" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "scene_content_decor_id_fkey" FOREIGN KEY ("decor_id") REFERENCES "decor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_scene_content" ("id", "order", "events", "content_id", "scene_id", "decor_id")
SELECT "id", "order", "events", "content_id", "scene_id", "decor_id"
FROM "scene_content";

DROP TABLE "scene_content";
ALTER TABLE "new_scene_content" RENAME TO "scene_content";

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
