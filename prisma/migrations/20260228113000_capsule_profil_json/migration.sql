PRAGMA foreign_keys=OFF;

CREATE TABLE "new_capsule" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "type" TEXT,
  "grid" TEXT,
  "profil" TEXT
);

INSERT INTO "new_capsule" ("id", "name", "type", "grid", "profil")
SELECT
  "id",
  "name",
  "type",
  "grid",
  json_object(
    'itemDurationMode', COALESCE("item_duration_mode", 'auto'),
    'itemDurationSec', "item_duration_sec",
    'defaultItemIntroTransition', "default_item_intro_transition",
    'defaultItemOutroTransition', "default_item_outro_transition"
  )
FROM "capsule";

DROP TABLE "capsule";
ALTER TABLE "new_capsule" RENAME TO "capsule";

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
